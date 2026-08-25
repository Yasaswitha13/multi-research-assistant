import os
import httpx

TAVILY_URL = "https://api.tavily.com/search"


async def web_search(query: str, max_results: int = 4) -> list[dict]:
    """
    Runs a real web search via Tavily (built for LLM agents — concise, relevant results
    rather than raw SERP HTML). Returns a list of {title, url, content} dicts.

    Tavily free tier: 1,000 searches/month, no credit card required.
    Get a key at https://tavily.com
    """
    api_key = os.environ["TAVILY_API_KEY"]
    body = {
        "api_key": api_key,
        "query": query,
        "max_results": max_results,
        "search_depth": "basic",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(TAVILY_URL, json=body)
        resp.raise_for_status()
        data = resp.json()

    return [
        {
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "content": r.get("content", ""),
        }
        for r in data.get("results", [])
    ]
