import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { patternToRegExp } from "../src/core/crawl.js";
import type { Envelope } from "../src/core/schema.js";
import type { Fetchkeep } from "../src/core/service.js";
import { html, startServer, type TestServer } from "./support/server.js";
import { tempHome, testService } from "./support/service.js";

let srv: TestServer;
const page = (title: string, links: string[], extra = "") =>
  html(`<html><head><title>${title}</title></head><body><main><h1>${title}</h1><p>Body of ${title}. ${extra}</p>${links.map((l) => `<a href="${l}">${l}</a>`).join(" ")}</main></body></html>`);

beforeAll(async () => {
  srv = await startServer({
    "/robots.txt": (_q, res) => void res.writeHead(200, { "content-type": "text/plain" }).end("User-agent: *\nDisallow: /private\nSitemap: /sitemap.xml\n"),
    "/sitemap.xml": (_q, res) =>
      void res
        .writeHead(200, { "content-type": "application/xml" })
        .end(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://localhost:${srv.port}/from-sitemap</loc></url></urlset>`),
    "/": page("Home", ["/a", "/b", "/private", "http://example.com/external", "/a#section", "/logo.png", "/old"]),
    "/a": page("A", ["/a/1", "/b", "/"]),
    "/b": page("B", ["/b/1", "/a?utm_source=x"]),
    "/a/1": page("Leaf", ["/a/1/deep"], "shared text"),
    "/b/1": page("Leaf", ["/a/1/deep"], "shared text"),
    "/a/1/deep": page("Deep", []),
    "/from-sitemap": page("Sitemap only", []),
    "/private": page("Private", []),
    "/old": (_q, res) => void res.writeHead(301, { location: "/a/1" }).end(),
  });
});
afterAll(() => srv.close());

const u = (p: string) => `http://localhost:${srv.port}${p}`;
interface CrawlData {
  crawlId: string;
  stopReason: string;
  counts: Record<string, number>;
  pages: { url: string; depth: number; state: string; reason?: string; ref?: string }[];
}
const data = (env: Envelope) => env.data as CrawlData;

async function withService<T>(fn: (fk: Fetchkeep) => Promise<T>): Promise<T> {
  const { home, cleanup } = tempHome();
  const fk = testService(home);
  try {
    return await fn(fk);
  } finally {
    await fk.close();
    cleanup();
  }
}

describe("crawl", () => {
  it("covers the same-origin graph once, honouring robots.txt and sitemaps", async () => {
    await withService(async (fk) => {
      srv.hits.clear();
      const env = await fk.crawl({ url: u("/"), maxDepth: 5, maxPages: 50, delayMs: 0, concurrency: 1 });
      expect(env.status).toBe("success");
      const d = data(env);
      expect(d.stopReason).toBe("exhausted");
      const done = d.pages.filter((p) => p.state === "done").map((p) => new URL(p.url).pathname).sort();
      expect(done).toEqual(["/", "/a", "/a/1", "/a/1/deep", "/b", "/b/1", "/from-sitemap", "/old"].sort());
      expect(d.pages.find((p) => p.url.endsWith("/private"))).toMatchObject({ state: "skipped", reason: "robots_disallowed" });
      expect(srv.hits.get("/private") ?? 0).toBe(0);
      expect(srv.hits.get("/logo.png") ?? 0).toBe(0);
      // Each page fetched exactly once despite fragments, tracking params and repeated links.
      for (const p of ["/", "/a", "/b", "/b/1", "/a/1/deep"]) expect(srv.hits.get(p), p).toBe(1);
      // /old redirects to /a/1: the redirect target is not fetched a second time.
      expect(srv.hits.get("/a/1")).toBe(1);
      expect(d.counts.duplicates).toBe(1);
      expect(d.counts.skippedScope).toBeGreaterThan(0);
      // Saved pages are searchable immediately.
      expect((await fk.search({ query: "Deep" })).data).toMatchObject({ results: expect.arrayContaining([expect.objectContaining({ title: "Deep" })]) });
    });
  });

  it("reports depth_limit and page_limit", async () => {
    await withService(async (fk) => {
      const shallow = data(await fk.crawl({ url: u("/"), maxDepth: 1, sitemap: "skip", delayMs: 0 }));
      expect(shallow.stopReason).toBe("depth_limit");
      expect(Math.max(...shallow.pages.filter((p) => p.state === "done").map((p) => p.depth))).toBe(1);
      const limited = await fk.crawl({ url: u("/"), maxPages: 2, sitemap: "skip", delayMs: 0, concurrency: 1 });
      expect(data(limited).stopReason).toBe("page_limit");
      expect(data(limited).pages.filter((p) => p.state === "done")).toHaveLength(2);
      expect(limited.status).toBe("success");
    });
  });

  it("resumes without refetching completed pages", async () => {
    await withService(async (fk) => {
      srv.hits.clear();
      const first = data(await fk.crawl({ url: u("/"), maxPages: 3, maxDepth: 5, sitemap: "skip", delayMs: 0, concurrency: 1 }));
      expect(first.stopReason).toBe("page_limit");
      const second = data(await fk.crawl({ resume: first.crawlId, maxPages: 50 }));
      expect(second.crawlId).toBe(first.crawlId);
      expect(second.stopReason).toBe("exhausted");
      for (const p of ["/", "/a", "/b"]) expect(srv.hits.get(p), p).toBe(1);
    });
  });

  it("stops on cancellation with a partial result and a resume hint", async () => {
    await withService(async (fk) => {
      const ac = new AbortController();
      ac.abort();
      const env = await fk.crawl({ url: u("/"), delayMs: 0, signal: ac.signal });
      expect(env.status).toBe("partial");
      expect(data(env).stopReason).toBe("cancelled");
      expect((env.data as { resume?: unknown }).resume).toBeTruthy();
    });
  });

  it("returns root_failed when the start URL cannot be fetched", async () => {
    await withService(async (fk) => {
      const env = await fk.crawl({ url: u("/missing"), delayMs: 0, sitemap: "skip" });
      expect(env.status).toBe("error");
      expect(env.error?.code).toBe("http_error");
    });
  });
});

describe("patternToRegExp", () => {
  it("supports globs and regexes", () => {
    expect(patternToRegExp("/docs/**").test("/docs/a/b")).toBe(true);
    expect(patternToRegExp("/docs/*").test("/docs/a/b")).toBe(false);
    expect(patternToRegExp("/docs/*.html").test("/docs/x.html")).toBe(true);
    expect(patternToRegExp("/\\/v\\d+\\//").test("/api/v2/x")).toBe(true);
  });
});
