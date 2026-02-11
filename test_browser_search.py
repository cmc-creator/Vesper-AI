from playwright.sync_api import sync_playwright
import urllib.parse

def test_browser_search(query):
    print(f"Testing browser search: {query}\n")
    
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        # Search Google
        url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
        print(f"Loading: {url}")
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_timeout(2000)  # Let JS settle
        
        # Debug: save screenshot and HTML
        page.screenshot(path="search_screenshot.png")
        with open("search_page.html", "w", encoding="utf-8") as f:
            f.write(page.content())
        print("Saved screenshot and HTML for debugging")
        
        # Try different selectors
        print("\nTrying different selectors...")
        
        # Try selection strategy 1: div.g (traditional)
        search_results = page.query_selector_all('div.g')
        print(f"div.g: {len(search_results)}")
        
        # Try selection strategy 2: newer Google structure
        if len(search_results) == 0:
            search_results = page.query_selector_all('div[data-snf="x5WNvb"]')
            print(f"div[data-snf]: {len(search_results)}")
        
        # Try selection strategy 3: just look for all h3 elements
        if len(search_results) == 0:
            print("Falling back to h3 search...")
            h3_elements = page.query_selector_all('h3')
            print(f"Found {len(h3_elements)} h3 elements")
            search_results = []
            for h3 in h3_elements[:5]:
                parent = h3.evaluate("el => el.closest('div')")
                if parent:
                    search_results.append(h3)
        
        print(f"Found {len(search_results)} result containers\n")
        
        for i, result in enumerate(search_results[:5]):
            try:
                # For h3-based results
                if result.tag_name == 'h3':
                    title = result.inner_text()
                    parent_a = result.evaluate("el => el.closest('a')")
                    url = parent_a.get_attribute('href') if parent_a else ""
                    
                    # Try to find snippet
                    snippet = ""
                    parent_div = result.evaluate("el => el.closest('div').parentElement")
                    if parent_div:
                        snippet_elem = parent_div.query_selector('div[data-sncf], .VwiC3b, .lEBKkf')
                        if snippet_elem:
                            snippet = snippet_elem.inner_text()
                    
                    results.append({
                        "title": title,
                        "url": url,
                        "snippet": snippet
                    })
                    
                    print(f"{i+1}. {title}")
                    print(f"   {url}")
                    print(f"   {snippet[:100]}...\n")
                
                else:
                    # For div.g or similar containers
                    title_elem = result.query_selector('h3')
                    link_elem = result.query_selector('a')
                    snippet_elem = result.query_selector('div[data-sncf="1"], .VwiC3b, .lEBKkf')
                    
                    if title_elem and link_elem:
                        title = title_elem.inner_text()
                        url = link_elem.get_attribute('href')
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
    results = test_browser_search("weather in surprise arizona")
    print(f"\n✅ Total results: {len(results)}")
