from ddgs import DDGS

def test_ddgs_search(query):
    print(f"Testing search: {query}")
    results = []
    
    with DDGS() as ddgs:
        search_results = ddgs.text(query, max_results=5)
        for result in search_results:
            results.append({
                "title": result.get("title", ""),
                "url": result.get("href", ""),
                "snippet": result.get("body", "")
            })
    
    print(f"\nFound {len(results)} results:\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. {r['title']}")
        print(f"   {r['url']}")
        print(f"   {r['snippet'][:100]}...\n")
    
    return results

if __name__ == "__main__":
    test_ddgs_search("weather in surprise arizona")
