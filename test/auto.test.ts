import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BrowserPool } from "../src/browser/pool.js";
import { loadConfig } from "../src/core/config.js";
import { FetchkeepError } from "../src/core/errors.js";
import { extractHtml } from "../src/core/extract/html.js";
import { shouldEscalate } from "../src/core/heuristics.js";
import { Envelope } from "../src/core/schema.js";
import { Fetchkeep } from "../src/core/service.js";
import { FakeBrowser } from "./support/fake-browser.js";
import { makePdf } from "./support/pdf.js";
import { html, startServer, type TestServer } from "./support/server.js";
import { tempHome } from "./support/service.js";

const SPA = `<html><head><title>App</title><script src="/app.js"></script></head><body><div id="root"></div><noscript>You need to enable JavaScript to run this app.</noscript></body></html>`;
const RENDERED = `<html><head><title>App</title></head><body><div id="root"><main><h1>Dashboard</h1><p>${"Rendered by JavaScript. ".repeat(20)}</p></main></div></body></html>`;
const ARTICLE = `<html><head><title>Doc</title><script>analytics()</script></head><body><main><h1>Doc</h1><p>${"Plain server-rendered text. ".repeat(30)}</p></main></body></html>`;

let srv: TestServer;
beforeAll(async () => {
  srv = await startServer({ "/spa": html(SPA), "/article": html(ARTICLE), "/forbidden": html("<p>Checking your browser…</p>", 403), "/gone": html("gone", 404),
    "/doc.pdf": (_q, res) => void res.writeHead(200, { "content-type": "application/pdf" }).end(makePdf([[{ text: "Quarterly tide report" }]], "Tides")),
  });
});
afterAll(() => srv.close());
const u = (p: string) => `http://localhost:${srv.port}${p}`;

function service(home: string, providers: FakeBrowser[], extra: Parameters<typeof loadConfig>[0] = {}): Fetchkeep {
  const config = loadConfig({ env: {}, ...extra, overrides: { home, network: { allowHosts: ["localhost"] }, ...extra.overrides } });
  return new Fetchkeep(config, { browserProviders: providers });
}

describe("shouldEscalate", () => {
  const doc = (h: string) => extractHtml(h, { url: "https://x.test/" });
  it("escalates empty SPA shells, JS-required notices and HTTP challenge statuses", () => {
    expect(shouldEscalate(doc(SPA), null).escalate).toBe(true);
    expect(shouldEscalate(doc(`<html><body><p>Please enable JavaScript to continue.</p><script>x()</script></body></html>`), null).escalate).toBe(true);
    // Content embedded as inline data and rendered by script (quotes.toscrape.com/js style).
    expect(shouldEscalate(doc(`<html><body><h1>Quotes</h1><div class="c"></div><script>var data = ${JSON.stringify("q".repeat(1500))};</script></body></html>`), null).escalate).toBe(true);
    const err403 = new FetchkeepError("http_error", "HTTP 403", { details: { status: 403 } });
    expect(shouldEscalate(null, err403)).toMatchObject({ escalate: true });
  });
  it("keeps complete server-rendered pages and ordinary errors on HTTP", () => {
    expect(shouldEscalate(doc(ARTICLE), null).escalate).toBe(false);
    expect(shouldEscalate(doc("<html><body><p>Tiny static page without scripts.</p></body></html>"), null).escalate).toBe(false);
    // A small page with one analytics tag (e.g. example.com) is complete.
    expect(shouldEscalate(doc(`<html><body><h1>Example</h1><p>${"Short but complete page. ".repeat(6)}</p><script src="/s.js"></script></body></html>`), null).escalate).toBe(false);
    const err404 = new FetchkeepError("http_error", "HTTP 404", { details: { status: 404 } });
    expect(shouldEscalate(null, err404).escalate).toBe(false);
    expect(shouldEscalate(null, new FetchkeepError("blocked_by_policy", "no")).escalate).toBe(false);
  });
});

describe("auto mode", () => {
  const { home, cleanup } = tempHome();
  afterAll(cleanup);

  it("returns a partial HTTP result with an explanation when no browser is enabled", async () => {
    const fk = service(home, []);
    const env = Envelope.parse(await fk.fetch({ url: u("/spa") }));
    await fk.close();
    expect(env.status).toBe("partial");
    expect(env.backend).toMatchObject({ mode: "auto", used: "http", escalated: false });
    expect(env.backend!.attempts.map((a) => [a.backend, a.outcome])).toEqual([
      ["http", "insufficient"],
      ["chromium", "unavailable"],
    ]);
    expect(env.warnings.join(" ")).toMatch(/no browser backend is enabled/);
  });

  it("escalates to the enabled browser and records both attempts", async () => {
    const chromium = new FakeBrowser("chromium", { html: RENDERED });
    const fk = service(home, [chromium]);
    const env = Envelope.parse(await fk.fetch({ url: u("/spa") }));
    const plain = Envelope.parse(await fk.fetch({ url: u("/article") }));
    await fk.close();
    expect(env.status).toBe("success");
    expect(env.backend).toMatchObject({ used: "chromium", escalated: true });
    expect(env.backend!.attempts.map((a) => [a.backend, a.outcome])).toEqual([
      ["http", "insufficient"],
      ["chromium", "success"],
    ]);
    expect(env.content!.text).toContain("Rendered by JavaScript.");
    expect(env.document!.backend).toBe("chromium");
    // Complete pages never launch a browser.
    expect(plain.backend).toMatchObject({ used: "http", escalated: false });
    expect(chromium.renders).toEqual([u("/spa")]);
  });

  it("falls back across browsers in preference order", async () => {
    const chromium = new FakeBrowser("chromium", { error: new FetchkeepError("browser_failed", "crashed") });
    const lightpanda = new FakeBrowser("lightpanda", { html: RENDERED });
    const fk = service(home, [lightpanda, chromium]);
    const env = await fk.fetch({ url: u("/forbidden") });
    await fk.close();
    expect(env.backend!.attempts.map((a) => [a.backend, a.outcome])).toEqual([
      ["http", "failed"],
      ["chromium", "failed"],
      ["lightpanda", "success"],
    ]);
    expect(env.backend!.used).toBe("lightpanda");
  });

  it("uses one deadline across attempts", async () => {
    const chromium = new FakeBrowser("chromium", "hang");
    const fk = service(home, [chromium]);
    const t0 = Date.now();
    const env = await fk.fetch({ url: u("/spa"), timeoutMs: 1500 });
    await fk.close();
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(3000);
    expect(env.status).toBe("partial");
    expect(env.backend!.attempts[1]).toMatchObject({ backend: "chromium", outcome: "failed", errorCode: "timeout" });
    expect(env.backend!.attempts.reduce((s, a) => s + a.durationMs, 0)).toBeLessThan(2000);
  });

  it("explicit browser modes never fall back to HTTP and explain missing browsers", async () => {
    const fk = service(home, []);
    const env = await fk.fetch({ url: u("/spa"), mode: "chromium" });
    expect(env.error).toMatchObject({ code: "browser_unavailable" });
    expect(env.error!.hint).toMatch(/never installs browsers/);
    const http = await fk.fetch({ url: u("/spa"), mode: "http" });
    expect(http.status).toBe("success");
    expect(http.backend!.attempts).toHaveLength(1);
    await fk.close();
    expect(srv.hits.get("/spa")).toBeGreaterThan(0);
  });

  it("fetches non-HTML resources over HTTP in explicit browser modes", async () => {
    const chromium = new FakeBrowser("chromium", { html: "", contentType: "application/pdf" });
    const fk = service(home, [chromium]);
    const env = Envelope.parse(await fk.fetch({ url: u("/doc.pdf"), mode: "chromium" }));
    await fk.close();
    expect(env.status).toBe("success");
    expect(env.document).toMatchObject({ backend: "http", strategy: "pdf" });
    expect(env.content!.text).toContain("Quarterly tide report");
    expect(env.backend!.attempts.map((a) => [a.backend, a.outcome, a.errorCode])).toEqual([
      ["chromium", "failed", "unsupported_content_type"],
      ["http", "success", undefined],
    ]);
  });

  it("reports an unavailable browser without trying it", async () => {
    const missing = new FakeBrowser("chromium", { html: RENDERED }, { available: false, detail: "headless shell not installed" });
    const fk = service(home, [missing]);
    const env = await fk.fetch({ url: u("/spa") });
    await fk.close();
    expect(env.status).toBe("partial");
    expect(env.backend!.attempts[1]).toMatchObject({ backend: "chromium", outcome: "unavailable", reason: "headless shell not installed" });
    expect(missing.renders).toHaveLength(0);
  });
});

describe("BrowserPool", () => {
  it("bounds concurrency and shuts the browser down after the idle timeout", async () => {
    vi.useFakeTimers();
    try {
      const fake = new FakeBrowser("chromium", { html: RENDERED });
      const pool = new BrowserPool(fake, 1, 60_000);
      const req = (url: string) => ({
        url,
        signal: new AbortController().signal,
        deadline: Date.now() + 10_000,
        policy: undefined as never,
        userAgent: "t",
        settleMs: 0,
        maxBytes: 1e6,
      });
      await Promise.all([pool.render(req("a")), pool.render(req("b")), pool.render(req("c"))]);
      expect(fake.maxConcurrent).toBe(1);
      expect(fake.closes).toBe(0);
      vi.advanceTimersByTime(59_999);
      expect(fake.closes).toBe(0);
      vi.advanceTimersByTime(1);
      expect(fake.closes).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes the browser after a failed render and rejects queued waiters on abort", async () => {
    const fake = new FakeBrowser("chromium", { error: new FetchkeepError("browser_failed", "boom") });
    const pool = new BrowserPool(fake, 1, 60_000);
    const base = { deadline: Date.now() + 10_000, policy: undefined as never, userAgent: "t", settleMs: 0, maxBytes: 1e6 };
    await expect(pool.render({ ...base, url: "x", signal: new AbortController().signal })).rejects.toMatchObject({ code: "browser_failed" });
    expect(fake.closes).toBe(1);
    const ac = new AbortController();
    ac.abort(new Error("stop"));
    await expect(pool.render({ ...base, url: "y", signal: ac.signal })).rejects.toThrow("stop");
    await pool.close();
  });
});
