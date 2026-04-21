import urllib.request
import json

url = "http://localhost:8003/bus/search?from=Bolu&to=Elaz%C4%B1%C4%9F&date=2026-04-30&passengers=1"

try:
    with urllib.request.urlopen(url) as response:
        print(f"Status: {response.getcode()}")
        print(f"Response: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
