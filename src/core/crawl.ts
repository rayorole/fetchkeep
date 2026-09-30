import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { roundTimings } from "./envelope.js";
import { FetchkeepError, toFetchkeepError } from "./errors.js";
import { RobotsCache } from "./robots.js";
import type { Envelope, FetchMode } from "./schema.js";
import type { Fetchkeep } from "./service.js";
import { readSitemaps } from "./sitemap.js";
import { CrawlRepo, type CrawlUrlRecord } from "./store/crawls.js";
import { versionRef } from "./store/store.js";
import { normalizeUrl } from "./url.js";

export type SitemapMode = "include" | "skip" | "only";
export type StopReason = "exhausted" | "page_limit" | "depth_limit" | "deadline" | "cancelled" | "root_failed";

export interface CrawlOptions {
  url: string;
  maxPages: number;
  maxDepth: number;
  /** Stay on the start URL's origin (scheme + host + port). Default true. */
  sameOrigin: boolean;
  /** Glob (`/docs/**`) or `/regex/` patterns matched against path + query. Empty = everything in scope. */
  include: string[];
  exclude: string[];
  respectRobots: boolean;
  delayMs: number;
  sitemap: SitemapMode;
  mode: FetchMode;
  concurrency: number;
  pageTimeoutMs: number;
}

export interface CrawlInput extends Partial<Omit<CrawlOptions, "url">> {
  url?: string;
  /** Resume a previous crawl by id; its stored options are reused. */
  resume?: string;
  /** Overall deadline for this run. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface CrawlCounts {
  fetched: number;
  saved: number;
  unchanged: number;
  failed: number;
  duplicates: number;
  skippedRobots: number;
  skippedScope: number;
  beyondDepth: number;
  queued: number;
}

const ASSET_RE = /\.(?:png|jpe?g|gif|webp|svg|ico|bmp|tiff?|mp[34]|m4a|webm|ogg|wav|avi|mov|mkv|zip|gz|tgz|bz2|xz|7z|rar|tar|exe|dmg|msi|deb|rpm|apk|iso|woff2?|ttf|otf|eot|css|js|mjs|map|wasm)$/i;

/** Converts a glob (`*` within a segment, `**` across segments) or `/regex/flags` into a RegExp. */
export function patternToRegExp(pattern: string): RegExp {
  const re = /^\/(.+)\/([a-z]*)$/.exec(pattern);
  if (re) return new RegExp(re[1]!, re[2]);
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        out += ".*";
        i++;
      } else out += "[^/]*";
    } else if (c === "?") out += "[^/]";
    else out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

function makeScope(opts: CrawlOptions): (url: URL) => string | null {
  const root = new URL(opts.url);
  const include = opts.include.map(patternToRegExp);
  const exclude = opts.exclude.map(patternToRegExp);
  return (url) => {
    if (url.protocol !== "http:" && url.protocol !== "https:") return "scheme";
    if (opts.sameOrigin && url.origin !== root.origin) return "origin";
    if (ASSET_RE.test(url.pathname)) return "asset";
    const target = url.pathname + url.search;
    if (include.length && !include.some((r) => r.test(target))) return "include";
    if (exclude.some((r) => r.test(target))) return "exclude";
    return null;
  };
}

/**
 * Bounded breadth-first crawler. Pages are fetched through the normal fetch path (network policy, limits,
 * backends) and saved. The frontier lives in SQLite so a stopped crawl can be resumed.
 */
export async function runCrawl(fk: Fetchkeep, input: CrawlInput): Promise<Envelope> {
  const started = performance.now();
  const repo = new CrawlRepo(fk.store.db);
  let crawlId: string;
  let opts: CrawlOptions;
  if (input.resume) {
    const prev = repo.get(input.resume);
    if (!prev) return errorEnv(new FetchkeepError("not_found", `No crawl with id ${input.resume}`), started);
    crawlId = prev.id;
    opts = { ...(prev.options as unknown as CrawlOptions) };
    // Limits may be raised on resume; scope stays as originally configured.
    if (input.maxPages !== undefined) opts.maxPages = input.maxPages;
    if (input.maxDepth !== undefined) opts.maxDepth = input.maxDepth;
  } else {
    if (!input.url) return errorEnv(new FetchkeepError("invalid_argument", "url is required"), started);
    try {
      fk.policy.checkUrl(input.url);
    } catch (err) {
      return errorEnv(err, started);
    }
    const c = fk.config.crawl;
    opts = {
      url: normalizeUrl(input.url),
      maxPages: input.maxPages ?? c.maxPages,
      maxDepth: input.maxDepth ?? c.maxDepth,
      sameOrigin: input.sameOrigin ?? true,
      include: input.include ?? [],
      exclude: input.exclude ?? [],
      respectRobots: input.respectRobots ?? c.respectRobots,
      delayMs: input.delayMs ?? c.delayMs,
      sitemap: input.sitemap ?? "include",
      mode: input.mode ?? "auto",
      concurrency: Math.min(Math.max(input.concurrency ?? 2, 1), 8),
      pageTimeoutMs: input.pageTimeoutMs ?? fk.config.timeoutMs,
    };
    crawlId = `c_${randomBytes(6).toString("hex")}`;
    repo.create(crawlId, opts.url, opts as unknown as Record<string, unknown>);
  }

  const signal = fk.deadline(input.timeoutMs ?? 300_000, input.signal);
  const robots = new RobotsCache(fk.http);
  const inScope = makeScope(opts);
  const counts: CrawlCounts = { fetched: 0, saved: 0, unchanged: 0, failed: 0, duplicates: 0, skippedRobots: 0, skippedScope: 0, beyondDepth: 0, queued: 0 };
  const warnings: string[] = [];
  const seenHashes = new Map<string, { url: string; docId: string }>();
  for (const r of repo.all(crawlId)) if (r.contentHash && r.docId && r.state === "done" && !seenHashes.has(r.contentHash)) seenHashes.set(r.contentHash, { url: r.url, docId: r.docId });
  const lastStart = new Map<string, number>();
  let rootError: FetchkeepError | null = null;

  const consider = async (raw: string, depth: number, source: string): Promise<void> => {
    let url: URL;
    try {
      url = new URL(normalizeUrl(raw));
    } catch {
      return;
    }
    const key = url.href;
    if (repo.has(crawlId, key)) return;
    const outOfScope = inScope(url);
    if (outOfScope) {
      counts.skippedScope++;
      return;
    }
    if (depth > opts.maxDepth) {
      counts.beyondDepth++;
      return;
    }
    if (opts.respectRobots) {
      const verdict = await robots.check(key, signal);
      if (!verdict.allowed) {
        if (repo.add(crawlId, key, depth, source, "skipped", verdict.reason ?? "robots")) counts.skippedRobots++;
        return;
      }
    }
    repo.add(crawlId, key, depth, source);
  };

  const pace = async (origin: string) => {
    const robotsDelay = opts.respectRobots ? ((await robots.crawlDelayMs(origin, signal)) ?? 0) : 0;
    const delay = Math.max(opts.delayMs, robotsDelay);
    const now = Date.now();
    const slot = Math.max(now, (lastStart.get(origin) ?? -Infinity) + delay);
    lastStart.set(origin, slot);
    if (slot > now) await sleep(slot - now, undefined, { signal });
  };

  const processOne = async (item: CrawlUrlRecord) => {
    const origin = new URL(item.url).origin;
    await pace(origin);
    const pageSignal = AbortSignal.any([signal, AbortSignal.timeout(opts.pageTimeoutMs)]);
    const { page, error } = await fk.retrievePage(item.url, opts.mode, pageSignal);
    if (signal.aborted) return; // leave it queued for resume
    counts.fetched++;
    if (!page) {
      counts.failed++;
      repo.update(crawlId, item.url, "failed", { reason: error?.code ?? "internal" });
      if (item.depth === 0 && item.source === "start") rootError = error;
      return;
    }
    const saved = fk.store.save(page, fk.config.rawSnapshots);
    if (saved.unchanged) counts.unchanged++;
    else counts.saved++;
    // A duplicate is identical content under a different document (URL); redirects to the same page are not.
    const prior = seenHashes.get(saved.contentHash);
    const dupOf = prior && prior.docId !== saved.docId ? prior.url : null;
    if (dupOf) counts.duplicates++;
    else if (!prior) seenHashes.set(saved.contentHash, { url: item.url, docId: saved.docId });
    repo.update(crawlId, item.url, "done", {
      reason: dupOf ? `duplicate_of ${dupOf}` : null,
      docId: saved.docId,
      version: saved.version,
      contentHash: saved.contentHash,
    });
    const final = normalizeUrl(page.finalUrl);
    if (final !== item.url) {
      // The redirect target is the same page: never fetch it again in this crawl.
      const fields = { reason: `redirect_from ${item.url}`, docId: saved.docId, version: saved.version, contentHash: saved.contentHash };
      if (!repo.add(crawlId, final, item.depth, "redirect", "done", fields.reason)) {
        if (repo.queued(crawlId).some((q) => q.url === final)) repo.update(crawlId, final, "done", fields);
      } else repo.update(crawlId, final, "done", fields);
    }
    if (opts.sitemap !== "only") {
      for (const link of page.extracted.outlinks) await consider(link, item.depth + 1, item.url);
    }
  };

  let stopReason: StopReason = "exhausted";
  try {
    if (!input.resume) {
      await consider(opts.url, 0, "start");
      if (opts.sitemap !== "skip") {
        const root = new URL(opts.url);
        const seeds = opts.respectRobots ? await robots.sitemaps(root.origin, signal) : [];
        if (seeds.length === 0) seeds.push(`${root.origin}/sitemap.xml`);
        const sm = await readSitemaps(fk.http, seeds, signal, opts.maxPages * 20);
        for (const u of sm.urls) await consider(u, 1, "sitemap");
        if (sm.files.length) warnings.push(`sitemaps read: ${sm.files.join(", ")} (${sm.urls.length} URLs)`);
      }
    }
    // maxPages counts pages processed across all runs of this crawl (resume continues the same budget).
    const processedBefore = repo.all(crawlId).filter((r) => (r.state === "done" && r.source !== "redirect") || r.state === "failed").length;
    let budget = opts.maxPages - processedBefore;
    const inflight = new Set<Promise<void>>();
    const inflightUrls = new Set<string>();
    while (!signal.aborted) {
      const queue = repo.queued(crawlId).filter((q) => !inflightUrls.has(q.url));
      while (inflight.size < opts.concurrency && queue.length && budget > 0) {
        const item = queue.shift()!;
        budget--;
        inflightUrls.add(item.url);
        const p: Promise<void> = processOne(item)
          .catch((err: unknown) => {
            const e = toFetchkeepError(err, signal);
            if (!signal.aborted) {
              counts.failed++;
              repo.update(crawlId, item.url, "failed", { reason: e.code === "internal" ? `internal: ${e.message}` : e.code });
            }
          })
          .finally(() => {
            inflight.delete(p);
            inflightUrls.delete(item.url);
          });
        inflight.add(p);
      }
      if (inflight.size === 0) break;
      await Promise.race(inflight);
    }
    await Promise.allSettled(inflight);
    const remaining = repo.queued(crawlId).length;
    counts.queued = remaining;
    if (signal.aborted) stopReason = isTimeout(signal) ? "deadline" : "cancelled";
    else if (rootError) stopReason = "root_failed";
    else if (remaining > 0) stopReason = "page_limit";
    else if (counts.beyondDepth > 0) stopReason = "depth_limit";
  } catch (err) {
    const e = toFetchkeepError(err, signal);
    if (e.code === "timeout" || e.code === "cancelled") stopReason = e.code === "timeout" ? "deadline" : "cancelled";
    else return errorEnv(e, started, { crawlId });
  }

  const complete = stopReason === "exhausted" || stopReason === "page_limit" || stopReason === "depth_limit";
  repo.finish(crawlId, complete ? "completed" : "stopped", stopReason);
  const rows = repo.all(crawlId);
  const pages = rows.slice(0, 1000).map((r) => ({
    url: r.url,
    depth: r.depth,
    state: r.state,
    ...(r.reason ? { reason: r.reason } : {}),
    ...(r.docId && r.version ? { ref: versionRef(r.docId, r.version) } : {}),
  }));
  if (rows.length > 1000) warnings.push(`page list truncated to 1000 of ${rows.length} entries`);
  const data = {
    crawlId,
    rootUrl: opts.url,
    stopReason,
    options: opts,
    counts: { ...counts, known: rows.length },
    pages,
    ...(complete ? {} : { resume: { crawlId, hint: `resume with web_crawl {"resume":"${crawlId}"}` } }),
  };
  if (stopReason === "root_failed") {
    return {
      status: "error",
      tool: "web_crawl",
      data,
      error: (rootError as FetchkeepError | null)?.toInfo() ?? { code: "internal", message: "start URL failed", retryable: false },
      timings: roundTimings({ totalMs: performance.now() - started }),
      warnings,
    };
  }
  return {
    status: complete ? "success" : "partial",
    tool: "web_crawl",
    data,
    timings: roundTimings({ totalMs: performance.now() - started }),
    warnings,
  };
}

function isTimeout(signal: AbortSignal): boolean {
  const r: unknown = signal.reason;
  return r instanceof Error && r.name === "TimeoutError";
}

function errorEnv(err: unknown, started: number, data?: unknown): Envelope {
  const e = toFetchkeepError(err);
  return {
    status: "error",
    tool: "web_crawl",
    error: e.toInfo(),
    ...(data ? { data } : {}),
    timings: roundTimings({ totalMs: performance.now() - started }),
    warnings: [],
  };
}
