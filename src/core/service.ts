import { extractWithOllama, type ExtractInput } from "./ai/ollama.js";
import { sliceMarkdown } from "./budget.js";
import { runCrawl, type CrawlInput } from "./crawl.js";
import type { FetchkeepConfig } from "./config.js";
import { errorEnvelope, roundTimings } from "./envelope.js";
import { FetchkeepError, toFetchkeepError } from "./errors.js";
import { retrieve, type RetrieveResult } from "./fetch.js";
import { sha256 } from "./hash.js";
import { HttpClient } from "./http.js";
import { NetworkPolicy } from "./netpolicy.js";
import type { Block, Citation, DocumentRef, Envelope, FetchMode } from "./schema.js";
import type { WebSearchProvider } from "./search/provider.js";
import { SearxngProvider } from "./search/searxng.js";
import { Store, docIdFor, parseRef, versionRef, type StoredVersion } from "./store/store.js";
import { USER_AGENT } from "../version.js";
import type { BrowserProvider } from "../browser/provider.js";
import { Browsers } from "../browser/registry.js";

export interface FetchInput {
  url: string;
  mode?: FetchMode;
  timeoutMs?: number;
  maxChars?: number;
  offset?: number;
  /** Save to the local store (default true). */
  save?: boolean;
  includeBlocks?: boolean;
  signal?: AbortSignal;
}

export interface ReadInput {
  /** URL, document id, or `fk:` reference (a block reference returns exactly that block). */
  target: string;
  version?: number;
  offset?: number;
  maxChars?: number;
  /** Block selection: `b3`, `b3-b7`, `b2,b5`. */
  blocks?: string;
  /** Find an exact (case-insensitive) quotation and return the blocks that contain it. */
  find?: string;
  includeBlocks?: boolean;
}

export interface SearchInput {
  query: string;
  source?: "local" | "web";
  limit?: number;
  allVersions?: boolean;
  target?: string;
  signal?: AbortSignal;
}

export interface ServiceDeps {
  webSearch?: WebSearchProvider | null;
  /** Replaces the configured browser providers (tests, embedding). */
  browserProviders?: BrowserProvider[];
}

/** The shared façade used by the CLI and the MCP server. Every public method returns an {@link Envelope}. */
export class Fetchkeep {
  readonly config: FetchkeepConfig;
  readonly policy: NetworkPolicy;
  readonly http: HttpClient;
  readonly browsers: Browsers;
  readonly userAgent: string;
  private storeInstance: Store | null = null;
  private readonly webSearch: WebSearchProvider | null;

  constructor(config: FetchkeepConfig, deps: ServiceDeps = {}) {
    this.config = config;
    this.policy = new NetworkPolicy(config.network);
    this.userAgent = config.userAgent ?? USER_AGENT;
    this.http = new HttpClient(this.policy, this.userAgent);
    this.browsers = new Browsers(config.browser, this.policy, deps.browserProviders);
    this.webSearch = deps.webSearch !== undefined ? deps.webSearch : config.search.searxng ? new SearxngProvider(config.search.searxng) : null;
  }

  get store(): Store {
    this.storeInstance ??= Store.openWorkspace(this.config.home, this.config.workspace);
    return this.storeInstance;
  }

  async close(): Promise<void> {
    await this.browsers.close();
    await this.http.close();
    this.storeInstance?.close();
    this.storeInstance = null;
  }

  deadline(timeoutMs: number | undefined, signal?: AbortSignal): AbortSignal {
    const t = AbortSignal.timeout(timeoutMs ?? this.config.timeoutMs);
    return signal ? AbortSignal.any([t, signal]) : t;
  }

  /** Validates the URL and runs the backend(s) for it within `timeoutMs`. Never throws; failures are returned in `error`. */
  async retrievePage(url: string, mode: FetchMode, timeoutMs: number, parent?: AbortSignal): Promise<RetrieveResult> {
    const deadline = Date.now() + timeoutMs;
    const signal = this.deadline(timeoutMs, parent);
    try {
      this.policy.checkUrl(url);
      return await retrieve(
        { http: this.http, browsers: this.browsers, policy: this.policy, userAgent: this.userAgent, settleMs: this.config.browser.settleMs },
        { url, mode, signal, deadline, limits: this.config.limits },
      );
    } catch (err) {
      return { page: null, backend: { mode, used: null, escalated: false, attempts: [] }, error: toFetchkeepError(err, signal), warnings: [] };
    }
  }

  async fetch(input: FetchInput): Promise<Envelope> {
    const started = performance.now();
    const mode = input.mode ?? "auto";
    const { page, backend, error, warnings } = await this.retrievePage(input.url, mode, input.timeoutMs ?? this.config.timeoutMs, input.signal);
    const signal = input.signal;
    if (!page) {
      return errorEnvelope("web_fetch", error, { backend, warnings, timings: roundTimings({ totalMs: performance.now() - started }) }, signal);
    }
    const save = input.save ?? true;
    let docId = docIdFor(page.finalUrl);
    let version = 0;
    let unchanged: boolean | undefined;
    let contentHash = "";
    if (save) {
      const saved = this.store.save(page, this.config.rawSnapshots);
      docId = saved.docId;
      version = saved.version;
      unchanged = saved.unchanged;
      contentHash = saved.contentHash;
    }
    const ex = page.extracted;
    const slice = sliceMarkdown(ex.markdown, ex.blocks, input.offset ?? 0, input.maxChars ?? this.config.maxChars);
    const reasons: NonNullable<Envelope["truncation"]>["reasons"] = [];
    if (slice.truncated) reasons.push("output_budget");
    if (page.inputTruncated) reasons.push(page.inputTruncated);
    const document: DocumentRef = {
      id: docId,
      version,
      ref: save ? versionRef(docId, version) : "",
      requestedUrl: page.requestedUrl,
      finalUrl: page.finalUrl,
      title: ex.title,
      contentType: page.contentType,
      httpStatus: page.httpStatus,
      fetchedAt: page.fetchedAt,
      contentHash: contentHash || sha256(ex.markdown),
      rawHash: page.rawHash,
      extractorVersion: ex.extractorVersion,
      strategy: ex.strategy,
      backend: page.backend,
      saved: save,
    };
    if (unchanged !== undefined) document.unchanged = unchanged;
    const allWarnings = [...warnings, ...ex.warnings];
    const env: Envelope = {
      status: page.inputTruncated || warnings.some((w) => w.startsWith("partial:")) ? "partial" : "success",
      tool: "web_fetch",
      document,
      content: { format: "markdown", text: slice.text, ...(input.includeBlocks ? { blocks: slice.blocks } : {}) },
      backend,
      truncation: {
        truncated: reasons.length > 0,
        reasons,
        totalChars: slice.totalChars,
        returnedChars: slice.text.length,
        offset: slice.offset,
        nextOffset: slice.nextOffset,
      },
      timings: roundTimings({ ...page.timings, totalMs: performance.now() - started }),
      warnings: allWarnings,
    };
    if (save) env.citation = citationFor(document);
    return env;
  }

  /** Bounded crawl; see {@link runCrawl}. */
  crawl(input: CrawlInput): Promise<Envelope> {
    return runCrawl(this, input);
  }

  /** Experimental schema-based extraction with a local Ollama model; see {@link extractWithOllama}. */
  extract(input: ExtractInput): Promise<Envelope> {
    return extractWithOllama(this, input);
  }

  read(input: ReadInput): Envelope {
    const started = performance.now();
    try {
      const ref = parseRef(input.target);
      const docId = this.store.resolveDocId(input.target);
      if (!docId) {
        throw new FetchkeepError("not_found", `No saved document for "${input.target}"`, {
          hint: "Fetch it first with web_fetch (or `fetchkeep fetch <url>`), or search the store with web_search.",
        });
      }
      const requestedVersion = input.version ?? ref?.version;
      const v = this.store.getVersion(docId, requestedVersion);
      if (!v) {
        throw new FetchkeepError("not_found", `Document ${docId} has no version ${requestedVersion}`, {
          details: { versions: this.store.listVersions(docId).map((x) => x.version) },
        });
      }
      const blocks = this.store.getBlocks(docId, v.version);
      const document = storedToRef(v);
      const base: Envelope = {
        status: "success",
        tool: "web_read",
        document,
        citation: citationFor(document),
        timings: {},
        warnings: v.meta.warnings,
      };
      const versions = this.store.listVersions(docId);

      const selection = ref?.blockId ?? input.blocks;
      if (selection) {
        const picked = selectBlocks(blocks, selection);
        if (picked.length === 0) throw new FetchkeepError("not_found", `No blocks match "${selection}" in ${v.ref}`);
        return {
          ...base,
          content: { format: "markdown", text: picked.map((b) => b.markdown).join("\n\n"), blocks: picked },
          data: { versions, citations: picked.map((b) => citationFor(document, b)) },
          timings: roundTimings({ totalMs: performance.now() - started }),
        };
      }
      if (input.find) {
        const matches = findQuote(blocks, input.find).map((m) => ({ ...m, citation: citationFor(document, m.block, m.quote) }));
        return {
          ...base,
          status: matches.length ? "success" : "partial",
          content: { format: "markdown", text: matches.map((m) => m.block.markdown).join("\n\n"), blocks: matches.map((m) => m.block) },
          data: { versions, matches: matches.map(({ block, ...rest }) => ({ blockId: block.id, ...rest })) },
          warnings: matches.length ? base.warnings : [...base.warnings, `quote not found: ${JSON.stringify(input.find)}`],
          timings: roundTimings({ totalMs: performance.now() - started }),
        };
      }
      const slice = sliceMarkdown(v.markdown, blocks, input.offset ?? 0, input.maxChars ?? this.config.maxChars);
      return {
        ...base,
        content: { format: "markdown", text: slice.text, ...(input.includeBlocks ? { blocks: slice.blocks } : {}) },
        truncation: {
          truncated: slice.truncated,
          reasons: slice.truncated ? ["output_budget"] : [],
          totalChars: slice.totalChars,
          returnedChars: slice.text.length,
          offset: slice.offset,
          nextOffset: slice.nextOffset,
        },
        data: { versions },
        timings: roundTimings({ totalMs: performance.now() - started }),
      };
    } catch (err) {
      return errorEnvelope("web_read", err, { timings: roundTimings({ totalMs: performance.now() - started }) });
    }
  }

  async search(input: SearchInput): Promise<Envelope> {
    const started = performance.now();
    const source = input.source ?? "local";
    try {
      if (source === "web") {
        if (!this.webSearch) {
          throw new FetchkeepError("search_provider_unavailable", "No web search provider is configured", {
            hint: "Web search is optional. Configure a SearXNG instance you control with FETCHKEEP_SEARXNG_URL or search.searxng.url. Local search needs no provider.",
          });
        }
        const results = await this.webSearch.search(input.query, { limit: input.limit ?? 10, signal: this.deadline(undefined, input.signal) });
        return {
          status: "success",
          tool: "web_search",
          data: { source, provider: this.webSearch.name, query: input.query, results },
          timings: roundTimings({ totalMs: performance.now() - started }),
          warnings: ["web results are not saved; call web_fetch on a result URL to save and cite it"],
        };
      }
      let docId: string | undefined;
      if (input.target) {
        const id = this.store.resolveDocId(input.target);
        if (!id) throw new FetchkeepError("not_found", `No saved document for "${input.target}"`);
        docId = id;
      }
      const hits = this.store.search(input.query, { limit: input.limit ?? 10, ...(input.allVersions ? { allVersions: true } : {}), ...(docId ? { docId } : {}) });
      return {
        status: "success",
        tool: "web_search",
        data: {
          source,
          query: input.query,
          workspace: this.config.workspace,
          documents: this.store.countDocuments(),
          results: hits.map((h) => ({
            ...h,
            citation: { ref: h.ref, url: h.url, title: h.title, fetchedAt: h.fetchedAt, version: h.version, blockId: h.blockId } as Partial<Citation>,
          })),
        },
        timings: roundTimings({ totalMs: performance.now() - started }),
        warnings: [],
      };
    } catch (err) {
      return errorEnvelope("web_search", err, { timings: roundTimings({ totalMs: performance.now() - started }) });
    }
  }
}

export function storedToRef(v: StoredVersion): DocumentRef {
  return {
    id: v.docId,
    version: v.version,
    ref: v.ref,
    requestedUrl: v.requestedUrl,
    finalUrl: v.finalUrl,
    title: v.title,
    contentType: v.contentType,
    httpStatus: v.httpStatus,
    fetchedAt: v.fetchedAt,
    contentHash: v.contentHash,
    rawHash: v.rawHash,
    extractorVersion: v.extractorVersion,
    strategy: v.strategy,
    backend: v.backend,
    saved: true,
  };
}

export function citationFor(doc: DocumentRef, block?: Block, quote?: string): Citation {
  const c: Citation = {
    ref: versionRef(doc.id, doc.version, block?.id),
    url: doc.finalUrl,
    title: doc.title,
    fetchedAt: doc.fetchedAt,
    version: doc.version,
    contentHash: doc.contentHash,
  };
  if (block) {
    c.blockId = block.id;
    c.blockHash = block.hash;
    c.quote = quote ?? block.text;
  }
  return c;
}

/** `b3`, `b3-b7`, `b2,b5,b9-b10`. */
export function selectBlocks(blocks: Block[], selection: string): Block[] {
  const wanted = new Set<number>();
  for (const part of selection.split(",")) {
    const m = /^\s*b?(\d+)\s*(?:-\s*b?(\d+))?\s*$/.exec(part);
    if (!m) throw new FetchkeepError("invalid_argument", `Invalid block selection "${part}" (use b3, b3-b7 or b2,b5)`);
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    for (let i = Math.min(from, to); i <= Math.max(from, to) && wanted.size < 10_000; i++) wanted.add(i);
  }
  return blocks.filter((b) => wanted.has(Number(b.id.slice(1))));
}

export interface QuoteMatch {
  block: Block;
  /** The exact source text (original casing) that matched. */
  quote: string;
  /** Character offset of the quote inside `block.text`. */
  offset: number;
}

/** Case-insensitive, whitespace-insensitive search; returns the exact original text span. */
export function findQuote(blocks: Block[], needle: string): QuoteMatch[] {
  const q = needle.replace(/\s+/g, " ").trim().toLowerCase();
  if (!q) return [];
  const out: QuoteMatch[] = [];
  for (const b of blocks) {
    // Collapse whitespace while remembering where each normalized character came from.
    let norm = "";
    const origin: number[] = [];
    for (let i = 0; i < b.text.length; i++) {
      const ch = b.text[i]!;
      if (/\s/.test(ch)) {
        if (norm.endsWith(" ") || norm === "") continue;
        norm += " ";
        origin.push(i);
        continue;
      }
      // toLowerCase can change length (e.g. "İ"); map every produced character back to i.
      const lower = ch.toLowerCase();
      norm += lower;
      for (let k = 0; k < lower.length; k++) origin.push(i);
    }
    const at = norm.indexOf(q);
    if (at < 0) continue;
    const start = origin[at]!;
    const end = origin[at + q.length - 1]! + 1;
    out.push({ block: b, quote: b.text.slice(start, end), offset: start });
  }
  return out;
}
