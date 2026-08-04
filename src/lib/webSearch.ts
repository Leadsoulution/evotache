export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** Tavily is purpose-built for LLM/agent search (clean structured results,
 * generous free tier) rather than raw SERP results an LLM has to parse
 * itself. One shared API key for the whole app, like TELEGRAM_BOT_TOKEN. */
export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Web search isn't configured (TAVILY_API_KEY is missing).");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: Math.min(Math.max(maxResults, 1), 10) }),
  });
  if (!response.ok) throw new Error(`Web search request failed (${response.status}): ${await response.text()}`);

  const data = (await response.json()) as { results?: { title: string; url: string; content: string }[] };
  return (data.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.content }));
}
