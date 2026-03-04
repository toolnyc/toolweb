export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

/**
 * Search via Brave Search API. Returns top results as structured data.
 * Free tier: 2K queries/month.
 */
export async function braveSearch(
  apiKey: string,
  query: string,
  count = 5,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: String(count),
    text_decorations: 'false',
  });

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`Brave Search error: ${res.status}`);
  }

  const data = (await res.json()) as {
    web?: {
      results?: Array<{
        title: string;
        url: string;
        description: string;
      }>;
    };
  };

  return (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }));
}
