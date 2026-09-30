export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
  engine?: string;
  publishedAt?: string;
}

export interface WebSearchOptions {
  limit: number;
  signal: AbortSignal;
}

/**
 * Optional web search. Fetchkeep never searches the web implicitly: callers must ask for `source: "web"` and a
 * provider must be configured by the user. Results are not saved; fetch a result URL to save and cite it.
 */
export interface WebSearchProvider {
  readonly name: string;
  search(query: string, opts: WebSearchOptions): Promise<WebSearchResult[]>;
}
