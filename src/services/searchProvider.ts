export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export interface SearchProvider {
  search(query: string, count: number): Promise<SearchResult[]>;
}

/**
 * Brave Search API, called directly from the device with the user's own
 * key -- the app's first generic outbound HTTP request (everything else is
 * either on-device inference or RNFS model downloads). No PocketPal-side
 * relay: the request goes straight from this device to Brave.
 */
export class BraveSearchProvider implements SearchProvider {
  constructor(private apiKey: string) {}

  async search(query: string, count: number): Promise<SearchResult[]> {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
      query,
    )}&count=${Math.max(1, Math.min(count, 20))}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave Search request failed with status ${response.status}`);
    }

    const data = await response.json();
    const results: any[] = data?.web?.results ?? [];
    return results.map(r => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.description ?? '',
    }));
  }
}

/** Formats results into a compact block suitable for injecting as an extra
 * system message ahead of the model's completion call. */
export function formatSearchResultsForContext(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return `Web search for "${query}" returned no results.`;
  }
  const lines = results.map(
    (r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.snippet}`,
  );
  return `Web search results for "${query}":\n\n${lines.join('\n\n')}`;
}
