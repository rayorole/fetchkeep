import { request } from "undici";
import { FetchkeepError, toFetchkeepError } from "../errors.js";
import type { WebSearchOptions, WebSearchProvider, WebSearchResult } from "./provider.js";

export interface SearxngOptions {
  /** Base URL of a SearXNG instance you run or trust, e.g. `http://127.0.0.1:8888`. */
  url: string;
  engines?: string | undefined;
  timeoutMs: number;
}

const MAX_BODY = 2 * 1024 * 1024;

/**
 * SearXNG JSON API (`/search?format=json`). The instance must enable the `json` output format in its settings.
 * The endpoint is user-configured and trusted, so it is not subject to the private-network policy (it is usually
 * local); the result URLs it returns are still fetched through the policy.
 */
export class SearxngProvider implements WebSearchProvider {
  readonly name = "searxng";

  constructor(private readonly opts: SearxngOptions) {}

  async search(query: string, opts: WebSearchOptions): Promise<WebSearchResult[]> {
    const url = new URL("search", this.opts.url.endsWith("/") ? this.opts.url : `${this.opts.url}/`);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    if (this.opts.engines) url.searchParams.set("engines", this.opts.engines);
    const signal = AbortSignal.any([opts.signal, AbortSignal.timeout(this.opts.timeoutMs)]);
    let status: number;
    let text: string;
    try {
      const res = await request(url, { signal, headers: { accept: "application/json" } });
      status = res.statusCode;
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of res.body as AsyncIterable<Buffer>) {
        size += chunk.length;
        if (size > MAX_BODY) {
          res.body.destroy();
          throw new FetchkeepError("search_provider_unavailable", "SearXNG response exceeded 2 MiB");
        }
        chunks.push(chunk);
      }
      text = Buffer.concat(chunks).toString("utf8");
    } catch (err) {
      const e = toFetchkeepError(err, signal);
      throw new FetchkeepError("search_provider_unavailable", `SearXNG request failed: ${e.message}`, { cause: err, retryable: true });
    }
    if (status === 403) {
      throw new FetchkeepError("search_provider_unavailable", "SearXNG refused the JSON format (HTTP 403)", {
        hint: "Enable `json` under `search.formats` in the SearXNG settings.yml.",
      });
    }
    if (status < 200 || status >= 300) throw new FetchkeepError("search_provider_unavailable", `SearXNG returned HTTP ${status}`, { retryable: status >= 500 });
    let body: { results?: { url?: string; title?: string; content?: string; engine?: string; publishedDate?: string | null }[] };
    try {
      body = JSON.parse(text) as typeof body;
    } catch {
      throw new FetchkeepError("search_provider_unavailable", "SearXNG returned invalid JSON");
    }
    const out: WebSearchResult[] = [];
    for (const r of body.results ?? []) {
      if (!r.url || !/^https?:/i.test(r.url)) continue;
      const item: WebSearchResult = { url: r.url, title: r.title ?? "", snippet: r.content ?? "" };
      if (r.engine) item.engine = r.engine;
      if (r.publishedDate) item.publishedAt = r.publishedDate;
      out.push(item);
      if (out.length >= opts.limit) break;
    }
    return out;
  }
}
