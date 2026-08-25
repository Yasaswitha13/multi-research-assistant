export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function webSearch(query: string, maxResults = 4): Promise<SearchResult[]> {
  const key = Deno.env.get("TAVILY_API_KEY");
  if (!key) return [];

  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: maxResults,
      search_depth: "basic",
    }),
  });
  if (!resp.ok) throw new Error(`Tavily ${resp.status}: ${(await resp.text()).slice(0, 200)}`);

  const data = await resp.json();
  return (data.results ?? []).map((r: { title?: string; url?: string; content?: string }) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content ?? "",
  }));
}
