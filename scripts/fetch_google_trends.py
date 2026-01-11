import sys
import json
import time
import random
from pytrends.request import TrendReq

def fetch_trends(keywords):
    """
    Fetches 7-day interest over time for a list of keywords using pytrends.
    Outputs JSON to stdout for the TS worker to consume.
    """
    try:
        # Initialize with a random user agent to avoid early throttling
        pytrends = TrendReq(hl='en-US', tz=360)
        
        # Build payload for 7 days
        pytrends.build_payload(keywords, cat=0, timeframe='now 7-d', geo='', gprop='')
        
        # Get interest over time
        data = pytrends.interest_over_time()
        
        if data.empty:
            return []

        results = []
        for index, row in data.iterrows():
            for kw in keywords:
                results.append({
                    "keyword": kw,
                    "timestamp": index.isoformat(),
                    "interest_score": int(row[kw])
                })
        
        return results
    except Exception as e:
        # If rate limited, we might see a 429. Pytrends handles some retries.
        print(f"Error fetching trends: {str(e)}", file=sys.stderr)
        return None

if __name__ == "__main__":
    # Expect keywords as comma-separated argument
    if len(sys.argv) < 2:
        print("Usage: python fetch_google_trends.py 'keyword1,keyword2'", file=sys.stderr)
        sys.exit(1)
        
    keywords_list = sys.argv[1].split(',')
    
    # Simple throttling logic: sleep between calls if multiple batches were requested (not implemented here but good to note)
    results = fetch_trends(keywords_list)
    
    if results is not None:
        print(json.dumps(results))
    else:
        sys.exit(1)
