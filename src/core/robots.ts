import { createRequire } from "node:module";
import { toFetchkeepError } from "./errors.js";
import type { HttpClient } from "./http.js";

// robots-parser is CommonJS with a mismatched ESM typing (default export); load it the way Node resolves it.
const robotsParser = createRequire(import.meta.url)("robots-parser") as (url: string, contents: string) => RobotRules;

export const ROBOTS_USER_AGENT = "Fetchkeep";
const MAX_ROBOTS_BYTES = 512 * 1024;
const MAX_CRAWL_DELAY_MS = 60_000;

export interface RobotsVerdict {
  allowed: boolean;
  reason?: string;
}

/** The subset of robots-parser's (unexported) Robot interface that Fetchkeep uses. */
interface RobotRules {
  isAllowed(url: string, ua?: string): boolean | undefined;
  getCrawlDelay(ua?: string): number | undefined;
  getSitemaps(): string[];
}

interface RobotsEntry {
  /** null → treat everything as allowed (no robots.txt). */
  robot: RobotRules | null;
  /** true → robots.txt could not be retrieved (5xx / network); crawling is refused per RFC 9309. */
  unreachable: boolean;
  sitemaps: string[];
  crawlDelayMs: number | null;
}

/**
 * robots.txt handling following RFC 9309: 2xx → parse (first 512 KiB); 4xx → no restrictions; 5xx or unreachable →
 * assume complete disallow. One fetch per origin per crawl.
 */
export class RobotsCache {
  private readonly entries = new Map<string, Promise<RobotsEntry>>();

  constructor(private readonly http: HttpClient) {}

  private load(origin: string, signal: AbortSignal): Promise<RobotsEntry> {
    let entry = this.entries.get(origin);
    if (!entry) {
      entry = this.fetchEntry(origin, signal);
      this.entries.set(origin, entry);
    }
    return entry;
  }

  private async fetchEntry(origin: string, signal: AbortSignal): Promise<RobotsEntry> {
    const url = `${origin}/robots.txt`;
    try {
      const res = await this.http.fetch({ url, signal, limits: { maxBytes: MAX_ROBOTS_BYTES, maxCompressedBytes: MAX_ROBOTS_BYTES, maxRedirects: 5 } });
      if (res.status >= 500) return { robot: null, unreachable: true, sitemaps: [], crawlDelayMs: null };
      if (res.status >= 400) return { robot: null, unreachable: false, sitemaps: [], crawlDelayMs: null };
      const robot = robotsParser(url, res.body.toString("utf8"));
      const delay = robot.getCrawlDelay(ROBOTS_USER_AGENT);
      return {
        robot,
        unreachable: false,
        sitemaps: robot.getSitemaps().flatMap((s) => {
          try {
            return [new URL(s, url).href];
          } catch {
            return [];
          }
        }),
        crawlDelayMs: delay === undefined ? null : Math.min(MAX_CRAWL_DELAY_MS, Math.max(0, delay * 1000)),
      };
    } catch (err) {
      const e = toFetchkeepError(err, signal);
      if (e.code === "cancelled" || e.code === "timeout") throw e;
      return { robot: null, unreachable: true, sitemaps: [], crawlDelayMs: null };
    }
  }

  async check(url: string, signal: AbortSignal): Promise<RobotsVerdict> {
    const entry = await this.load(new URL(url).origin, signal);
    if (entry.unreachable) return { allowed: false, reason: "robots_unreachable" };
    if (!entry.robot) return { allowed: true };
    return entry.robot.isAllowed(url, ROBOTS_USER_AGENT) === false ? { allowed: false, reason: "robots_disallowed" } : { allowed: true };
  }

  async sitemaps(origin: string, signal: AbortSignal): Promise<string[]> {
    return (await this.load(origin, signal)).sitemaps;
  }

  async crawlDelayMs(origin: string, signal: AbortSignal): Promise<number | null> {
    return (await this.load(origin, signal)).crawlDelayMs;
  }
}
