import requests

url = "http://localhost:8003/bus/search"
params = {
    "from": "Bolu",
    "to": "Elazığ",
    "date": "2026-04-30",
    "passengers": 1
}

try:
    response = requests.get(url, params=params)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
