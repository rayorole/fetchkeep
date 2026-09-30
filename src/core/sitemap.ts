import { gunzipSync } from "node:zlib";
import { toFetchkeepError } from "./errors.js";
import type { HttpClient } from "./http.js";

const MAX_SITEMAP_FILES = 20;
const MAX_SITEMAP_BYTES = 10 * 1024 * 1024;

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };

function locs(xml: string, parent: "url" | "sitemap"): string[] {
  const out: string[] = [];
  const re = new RegExp(`<(?:[\\w-]+:)?${parent}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${parent}>`, "gi");
  for (const m of xml.matchAll(re)) {
    const loc = /<(?:[\w-]+:)?loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/(?:[\w-]+:)?loc>/i.exec(m[1] ?? "")?.[1];
    if (loc) out.push(loc.replace(/&(amp|lt|gt|quot|apos);/g, (e) => ENTITIES[e] ?? e).trim());
  }
  return out;
}

export interface SitemapResult {
  urls: string[];
  files: string[];
  errors: string[];
}

/**
 * Reads sitemaps (XML, sitemap indexes, gzip, and plain-text lists), following index files breadth-first.
 * Bounded by file count, total bytes per file and `maxUrls`.
 */
export async function readSitemaps(http: HttpClient, seeds: string[], signal: AbortSignal, maxUrls: number): Promise<SitemapResult> {
  const queue = [...new Set(seeds)];
  const seen = new Set<string>();
  const urls = new Set<string>();
  const files: string[] = [];
  const errors: string[] = [];
  while (queue.length && files.length < MAX_SITEMAP_FILES && urls.size < maxUrls) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    try {
      const res = await http.fetch({ url: next, signal, limits: { maxBytes: MAX_SITEMAP_BYTES } });
      if (res.status >= 400) {
        errors.push(`${next}: HTTP ${res.status}`);
        continue;
      }
      files.push(next);
      let body = res.body;
      if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body, { maxOutputLength: MAX_SITEMAP_BYTES });
      const text = body.toString("utf8");
      if (/<(?:[\w-]+:)?sitemapindex\b/i.test(text)) {
        for (const loc of locs(text, "sitemap")) queue.push(loc);
      } else if (/<(?:[\w-]+:)?urlset\b/i.test(text)) {
        for (const loc of locs(text, "url")) if (urls.size < maxUrls) urls.add(loc);
      } else if (!text.trimStart().startsWith("<")) {
        for (const line of text.split(/\r?\n/)) if (/^https?:\/\//i.test(line.trim()) && urls.size < maxUrls) urls.add(line.trim());
      }
    } catch (err) {
      const e = toFetchkeepError(err, signal);
      if (e.code === "cancelled" || e.code === "timeout") throw e;
      errors.push(`${next}: ${e.code}`);
    }
  }
  return { urls: [...urls], files, errors };
}
