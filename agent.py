import matplotlib
matplotlib.use('Agg')

from flask import Flask, request, jsonify
import pandas as pd
from pandasai import SmartDataframe, SmartDatalake
# from langchain_groq.chat_models import ChatGroq
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
import requests
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
load_dotenv()

# Initialize the language model
# llm = ChatGroq(model_name="llama3-70b-8192", api_key=os.getenv("GROQ_API_KEY"))

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    max_tokens=None,
    timeout=None,
)

# Set up paths and configuration
nextjs_public_path = os.path.join(os.getcwd(), "public/")
os.makedirs(nextjs_public_path, exist_ok=True)
os.environ['MPLBACKEND'] = 'Agg'



def fetch_and_process_api_data(api_url):
    """
    Fetch data from the given API URL and convert it to a pandas DataFrame.
    """
    response = requests.get(api_url)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data: HTTP {response.status_code}")

    api_data = response.json()
    if not api_data['success']:
        raise Exception("API request was not successful")

    result = api_data['result']
    fields = result['fields']
    records = result['records']

    df = pd.DataFrame(records)
    column_order = [field['id'] for field in fields]
    df = df[column_order]

    return df

@app.route('/analyze', methods=['POST'])
def analyze_data():
    try:
        data = request.json
        if not data or 'urls' not in data or 'query' not in data:
            return jsonify({'error': 'Missing required parameters'}), 400

        urls = data['urls']
        query = data['query']
        
        # Engineer the prompt
        enhanced_query = query

        # Handle single URL case
        if isinstance(urls, str):
            df = fetch_and_process_api_data(urls)
            smart_df = SmartDataframe(
                df,
                config={
                    "llm": llm,
                    "enable_cache": False,
                    "save_charts_path": nextjs_public_path,
                    "save_charts": True,
                    "open_charts": False,
                    "save_logs": False,
                }
            )
            result = smart_df.chat(enhanced_query)

        # Handle multiple URLs case
        elif isinstance(urls, list):
            dataframes = []
            for url in urls:
                df = fetch_and_process_api_data(url)
                dataframes.append(df)

            smart_df = SmartDatalake(
                dataframes,
                config={
                    "llm": llm,
                    "enable_cache": False,
                    "save_charts_path": nextjs_public_path,
                    "save_charts": True,
                    "open_charts": False,
                    "save_logs": False,
                    
                }
            )
            result = smart_df.chat(enhanced_query)
        else:
            return jsonify({'error': 'Invalid URL format'}), 400

        print(result)

        return jsonify({'result': str(result)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True, threaded=False)

