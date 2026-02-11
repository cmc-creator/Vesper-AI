import requests
from bs4 import BeautifulSoup
import urllib.parse

def test_search(query):
    encoded = urllib.parse.quote(query)
    url = f"https://html.duckduckgo.com/html/?q={encoded}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    print(f"Testing URL: {url}")
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Content length: {len(response.content)}")
    
    soup = BeautifulSoup(response.content, 'lxml')
    
    # Debug: Save HTML to file
    with open('search_response.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify())
    print("Saved HTML to search_response.html")
    
    # Try to find results
    result_divs = soup.find_all('div', class_='result')
    print(f"Found {len(result_divs)} result divs")
    
    if not result_divs:
        # Check for other possible classes
        print("\nChecking for alternative structures...")
        print(f"All divs: {len(soup.find_all('div'))}")
        
        # Look for links
        links = soup.find_all('a')
        print(f"All links: {len(links)}")
        if links:
            print("First few links:", [a.get_text(strip=True)[:50] for a in links[:5]])
    
    results = []
    for div in result_divs[:5]:
        title_elem = div.find('a', class_='result__a')
        snippet_elem = div.find('a', class_='result__snippet')
        
        if title_elem:
            result = {
                "title": title_elem.get_text(strip=True),
                "url": title_elem.get('href', ''),
                "snippet": snippet_elem.get_text(strip=True) if snippet_elem else ""
            }
            results.append(result)
            print(f"\nResult: {result['title'][:50]}")
    
    return results

if __name__ == "__main__":
    results = test_search("weather in surprise arizona")
    print(f"\nTotal results: {len(results)}")
    for r in results:
        print(f"- {r['title']}")
        print(f"  {r['url']}")
