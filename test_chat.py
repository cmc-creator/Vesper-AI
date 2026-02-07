# Test chat endpoint
import requests
import json

url = "http://localhost:8000/api/chat"
payload = {"message": "hi"}

print("Testing chat endpoint...")
print(f"URL: {url}")
print(f"Payload: {payload}")

try:
    response = requests.post(url, json=payload)
    print(f"\nStatus: {response.status_code}")
    print(f"Headers: {response.headers}")
    print(f"Response: {response.text}")
    
    if response.ok:
        data = response.json()
        print(f"\nParsed response:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
