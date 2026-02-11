from playwright.sync_api import sync_playwright
import urllib.parse

def test_bing_search(query):
    print(f"Testing Bing search: {query}\n")
    
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        # Search Bing
        url = f"https://www.bing.com/search?q={urllib.parse.quote(query)}"
        print(f"Loading: {url}")
        page.goto(url, wait_until="networkidle")  # Wait for network to be idle
        
        # Wait for search results to appear
        try:
            page.wait_for_selector('li.b_algo', timeout=5000)
        except:
            print("No li.b_algo found, trying alternative wait...")
            page.wait_for_timeout(3000)
        
        # Debug
        page.screenshot(path="bing_screenshot.png")
        with open("bing_page.html", "w", encoding="utf-8") as f:
            f.write(page.content())
        print("Saved screenshot and HTML")
        
        # Extract Bing search results
        search_results = page.query_selector_all('li.b_algo')
        print(f"Found li.b_algo: {len(search_results)}")
        
        # Try alternative selectors
        if len(search_results) == 0:
            search_results = page.query_selector_all('#b_results li')
            print(f"Found #b_results li: {len(search_results)}")
        
        if len(search_results) == 0:
            all_h2 = page.query_selector_all('h2')
            print(f"Found h2 elements: {len(all_h2)}")
        print(f"Found {len(search_results)} result containers\n")
        
        for i, result in enumerate(search_results[:5]):
            try:
                title_elem = result.query_selector('h2 a')
                snippet_elem = result.query_selector('.b_caption p, .b_algoSlug')
                
                if title_elem:
                    title = title_elem.inner_text()
                    url = title_elem.get_attribute('href')
                    snippet = snippet_elem.inner_text() if snippet_elem else ""
                    
                    results.append({
                        "title": title,
                        "url": url,
                        "snippet": snippet
                    })
                    
                    print(f"{i+1}. {title}")
                    print(f"   {url}")
                    print(f"   {snippet[:100]}...\n")
            except Exception as e:
                print(f"Error parsing result {i+1}: {e}")
                continue
        
        browser.close()
    
    return results

if __name__ == "__main__":
    results = test_bing_search("weather in surprise arizona")
    print(f"\n✅ Total results: {len(results)}")
