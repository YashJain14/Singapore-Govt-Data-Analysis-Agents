const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// Function to parse date range
function parseDateRange(dateRange) {
    if (dateRange === 'CSV•MDDI') {
        return { startDate: '', endDate: '' };
    }
    const dates = dateRange.split(' to ');
    if (dates.length === 2) {
        return { startDate: dates[0], endDate: dates[1] };
    }
    return { startDate: '', endDate: '' };
}

// Function to scrape data from a single page
async function scrapeDataGovSgPage(pageNumber) {
    const url = `https://data.gov.sg/datasets?&page=${pageNumber}&formats=CSV`;
    const results = [];

    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        $('div > a[href^="/datasets/"]').each((index, element) => {
            const title = $(element).find('.prose-subhead-5').text().trim();
            const datasetId = $(element).attr('href').split('/')[2];
            const apiUrl = `https://data.gov.sg/api/action/datastore_search?resource_id=${datasetId}`;
            const dateRange = $(element).find('.prose-caption-2:last-child').text().trim();
            const { startDate, endDate } = parseDateRange(dateRange);

            results.push({
                title,
                datasetId,
                apiUrl,
                startDate,
                endDate
            });
        });

        return results;
    } catch (error) {
        console.error(`Error scraping page ${pageNumber}:`, error);
        return [];
    }
}

// Function to scrape data from all pages
async function scrapeAllPages() {
    const totalPages = 139;
    let allResults = [];

    for (let page = 1; page <= totalPages; page++) {
        console.log(`Scraping page ${page} of ${totalPages}...`);
        const pageResults = await scrapeDataGovSgPage(page);
        allResults = allResults.concat(pageResults);
    }

    return allResults;
}

// Function to save JSON
function saveJSON(data, filename) {
    const jsonData = JSON.stringify(data, null, 2); // Pretty print with 2 spaces indentation
    fs.writeFileSync(filename, jsonData, 'utf8');
}

// Main function to run the scraper
async function main() {
    try {
        console.log('Starting to scrape data from data.gov.sg...');
        const results = await scrapeAllPages();
        console.log(`Scraped ${results.length} datasets.`);

        const filename = 'GovDataset.json';
        saveJSON(results, filename);
        console.log(`Data saved to ${filename}`);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// Run the scraper
main();