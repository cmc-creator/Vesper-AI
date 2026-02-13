import urllib.request
import json

endpoints = [
    ("Analytics Summary", "http://localhost:8000/api/analytics/summary?days=30"),
    ("Personality Current", "http://localhost:8000/api/personality"),
    ("Personality Presets", "http://localhost:8000/api/personality/presets"),
    ("Research Search", "http://localhost:8000/api/research/search?q=test"),
    ("Research by Source", "http://localhost:8000/api/research/by-source?source=web"),
]

print("Testing all new endpoints:\n")
for name, url in endpoints:
    try:
        resp = urllib.request.urlopen(url)
        data = resp.read().decode()
        print(f"✅ {name}: HTTP {resp.status}")
        if "error" in data.lower():
            print(f"   ⚠️  Response contains error")
        else:
            print(f"   ✓ Response OK")
    except Exception as e:
        print(f"❌ {name}: {str(e)[:60]}")

print("\nAll endpoint tests completed!")
