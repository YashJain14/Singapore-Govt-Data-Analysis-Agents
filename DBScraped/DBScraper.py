import requests
from bs4 import BeautifulSoup
import json
import time
import os
from typing import List, Dict, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from queue import Queue
import threading
from itertools import product

class DataGovSGScraper:
    def __init__(self):
        self.base_url = 'https://data.gov.sg/datasets'
        self.topics = [
            'housing',
            'health',
            'social',
            'transport',
            'artsandculture',
            'education',
            'economy',
            'environment'
        ]
        # Rate limiting
        self.request_queue = Queue()
        self.min_request_interval = 0.1  # 100ms between requests
        self.last_request_time = time.time()
        self.request_lock = threading.Lock()
        
    def rate_limited_request(self, url: str, params: Dict) -> requests.Response:
        """Make a rate-limited request"""
        with self.request_lock:
            current_time = time.time()
            time_since_last_request = current_time - self.last_request_time
            if time_since_last_request < self.min_request_interval:
                time.sleep(self.min_request_interval - time_since_last_request)
            
            response = requests.get(url, params=params)
            self.last_request_time = time.time()
            return response

    def extract_date_range(self, text: str) -> tuple[Optional[str], Optional[str]]:
        """Extract start and end dates from text, return None if not found"""
        if not text:
            return None, None
            
        # Remove common date text artifacts
        text = text.lower().replace('updated:', '').strip()
        
        # Split on "to" and clean up
        if 'to' in text:
            parts = text.split('to')
            start_date = parts[0].strip()
            end_date = parts[1].strip()
        else:
            # If there's no "to", treat the whole text as both start and end date
            start_date = text.strip()
            end_date = start_date
            
        # Validate dates - return None if they don't look like dates
        date_indicators = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        
        if not any(indicator in start_date.lower() for indicator in date_indicators):
            start_date = None
        if not any(indicator in end_date.lower() for indicator in date_indicators):
            end_date = None
            
        return start_date, end_date

    def validate_dataset(self, dataset: Dict) -> bool:
        """Validate that all required fields are present and non-empty"""
        required_fields = ['title', 'url', 'topic', 'organization']
        return all(dataset.get(field) for field in required_fields)

    def scrape_page(self, topic: str, page: int) -> List[Dict]:
        """Scrape a single page of datasets"""
        datasets = []
        
        params = {
            'topics': topic,
            'page': page,
            'formats': 'CSV'
        }
        
        try:
            response = self.rate_limited_request(self.base_url, params)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            dataset_links = soup.find_all('a', class_='flex')
            
            if not dataset_links:
                print(f"No datasets found for {topic} on page {page}")
                return []
            
            for link in dataset_links:
                dataset = {
                    'topic': topic,
                    'startdate': None,
                    'enddate': None
                }
                
                # Extract title
                title_elem = link.find('p', class_='prose-subhead-5')
                if title_elem:
                    dataset['title'] = title_elem.text.strip()
                
                # Extract URL
                href = link.get('href')
                if href:
                    dataset['url'] = href
                
                # Extract date range
                date_elem = link.find('p', class_='prose-caption-2')
                if date_elem:
                    start_date, end_date = self.extract_date_range(date_elem.text)
                    dataset['startdate'] = start_date
                    dataset['enddate'] = end_date
                
                # Extract organization
                org_elem = link.find('span', class_='whitespace-nowrap')
                if org_elem:
                    dataset['organization'] = org_elem.text.strip()
                
                if self.validate_dataset(dataset):
                    datasets.append(dataset)
                
        except requests.RequestException as e:
            print(f"Error scraping {topic} page {page}: {str(e)}")
        
        return datasets

    def scrape_topic_parallel(self, topic: str, start_page: int = 1, end_page: int = 20) -> List[Dict]:
        """Scrape a topic using parallel processing"""
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_page = {
                executor.submit(self.scrape_page, topic, page): page
                for page in range(start_page, end_page + 1)
            }
            
            datasets = []
            for future in as_completed(future_to_page):
                page = future_to_page[future]
                try:
                    page_datasets = future.result()
                    datasets.extend(page_datasets)
                    print(f"Completed {topic} page {page} - Found {len(page_datasets)} datasets")
                except Exception as e:
                    print(f"Error processing {topic} page {page}: {str(e)}")
                    
        return datasets

    def scrape_all_topics(self, start_page: int = 1, end_page: int = 20) -> Dict:
        """Scrape all topics in parallel"""
        all_data = {
            'metadata': {
                'scraped_at': datetime.now().isoformat(),
                'total_datasets': 0,
                'topics_count': {}
            },
            'datasets': []
        }
        
        os.makedirs('output', exist_ok=True)
        
        # Process topics in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_topic = {
                executor.submit(self.scrape_topic_parallel, topic, start_page, end_page): topic
                for topic in self.topics
            }
            
            for future in as_completed(future_to_topic):
                topic = future_to_topic[future]
                try:
                    topic_datasets = future.result()
                    
                    # Update metadata
                    topic_count = len(topic_datasets)
                    all_data['metadata']['topics_count'][topic] = topic_count
                    all_data['metadata']['total_datasets'] += topic_count
                    
                    # Save topic-specific JSON
                    with open(f'output/{topic}_datasets.json', 'w', encoding='utf-8') as f:
                        json.dump({
                            'metadata': {
                                'topic': topic,
                                'count': topic_count,
                                'scraped_at': datetime.now().isoformat()
                            },
                            'datasets': topic_datasets
                        }, f, indent=2, ensure_ascii=False)
                    
                    print(f"Saved {topic_count} {topic} datasets")
                    
                    # Add to main dataset
                    all_data['datasets'].extend(topic_datasets)
                    
                except Exception as e:
                    print(f"Error processing topic {topic}: {str(e)}")
        
        return all_data

    def save_datasets(self, data: Dict, output_file: str = 'output/all_datasets.json'):
        """Save all datasets to JSON file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\nTotal datasets saved: {data['metadata']['total_datasets']}")
        print("\nDatasets per topic:")
        for topic, count in data['metadata']['topics_count'].items():
            print(f"{topic}: {count}")

def main():
    scraper = DataGovSGScraper()
    
    print("Starting parallel data collection from data.gov.sg...")
    all_data = scraper.scrape_all_topics(start_page=1, end_page=20)
    
    scraper.save_datasets(all_data)
    
    print("\nScraping completed! Check the 'output' directory for results.")

if __name__ == "__main__":
    main()