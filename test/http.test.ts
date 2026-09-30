import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FetchkeepError } from "../src/core/errors.js";
import { fetchViaHttp } from "../src/core/fetch-http.js";
import { HttpClient } from "../src/core/http.js";
import { NetworkPolicy } from "../src/core/netpolicy.js";
import { html, startServer, type TestServer } from "./support/server.js";

let srv: TestServer;
const big = "x".repeat(2 * 1024 * 1024);

beforeAll(async () => {
  srv = await startServer({
    "/page": html("<html><head><title>Page</title></head><body><main><h1>Hi</h1><p>Hello world.</p></main></body></html>"),
    "/to-page": (_q, res) => void res.writeHead(302, { location: "/page" }).end(),
    "/to-loopback": (_q, res) => void res.writeHead(301, { location: `http://127.0.0.1:${srv.port}/page` }).end(),
    "/loop": (_q, res) => void res.writeHead(302, { location: "/loop" }).end(),
    "/big": (_q, res) => void res.writeHead(200, { "content-type": "text/plain" }).end(big),
    "/bomb": (_q, res) => {
      res.writeHead(200, { "content-type": "text/plain", "content-encoding": "gzip" }).end(gzipSync(Buffer.alloc(20 * 1024 * 1024, 97)));
    },
    "/gzip-html": (_q, res) => {
      const body = gzipSync("<html><head><title>Zipped</title></head><body><p>compressed body text</p></body></html>");
      res.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" }).end(body);
    },
    "/latin1": (_q, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=iso-8859-1" }).end(Buffer.from("<html><body><p>Café crème</p></body></html>", "latin1"));
    },
    "/slow": (_q, res) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.write("<html>");
      // Intentionally never ends; closeAllConnections() cleans up.
    },
    "/script": html(`<html><head><title>Original</title><script>document.title = "Hacked"; document.body.innerHTML = "<p>INJECTED</p>";</script></head>
      <body><main><h1>Static heading</h1><p>Static paragraph that should survive.</p></main><script>document.write("<p>WRITTEN</p>")</script></body></html>`),
    "/500": html("<p>oops</p>", 500),
  });
});
afterAll(() => srv.close());

const local = new NetworkPolicy({ allowHosts: ["localhost"] });
const client = (policy = local) => new HttpClient(policy, "fetchkeep-test");
const signal = (ms = 5_000) => AbortSignal.timeout(ms);
const localUrl = (path: string) => `http://localhost:${srv.port}${path}`;

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "ok";
  } catch (e) {
    expect(e).toBeInstanceOf(FetchkeepError);
    return (e as FetchkeepError).code;
  }
}

describe("HttpClient network policy", () => {
  it("blocks loopback by default, both as IP literal and via DNS", async () => {
    const c = client(new NetworkPolicy());
    expect(await codeOf(c.fetch({ url: `${srv.url}/page`, signal: signal() }))).toBe("blocked_by_policy");
    expect(await codeOf(c.fetch({ url: localUrl("/page"), signal: signal() }))).toBe("blocked_by_policy");
    expect(srv.hits.get("/page") ?? 0).toBe(0);
  });

  it("re-checks every redirect hop", async () => {
    // localhost is allow-listed, the redirect target 127.0.0.1 is not.
    expect(await codeOf(client().fetch({ url: localUrl("/to-loopback"), signal: signal() }))).toBe("blocked_by_policy");
  });

  it("follows allowed redirects and records the chain", async () => {
    const res = await client().fetch({ url: localUrl("/to-page"), signal: signal() });
    expect(res.status).toBe(200);
    expect(res.finalUrl).toBe(localUrl("/page"));
    expect(res.redirects).toEqual([{ url: localUrl("/to-page"), status: 302 }]);
  });

  it("stops redirect loops", async () => {
    expect(await codeOf(client().fetch({ url: localUrl("/loop"), signal: signal(), limits: { maxRedirects: 3 } }))).toBe("too_many_redirects");
  });
});

describe("HttpClient limits", () => {
  it("truncates at the decompressed size limit", async () => {
    const res = await client().fetch({ url: localUrl("/big"), signal: signal(), limits: { maxBytes: 100_000 } });
    expect(res.truncated).toBe("decompressed_limit");
    expect(res.body.length).toBe(100_000);
  });

  it("truncates at the compressed size limit", async () => {
    const res = await client().fetch({ url: localUrl("/big"), signal: signal(), limits: { maxCompressedBytes: 50_000 } });
    expect(res.truncated).toBe("compressed_limit");
    expect(res.compressedBytes).toBe(50_000);
  });

  it("bounds decompression bombs by decoded size", async () => {
    const res = await client().fetch({ url: localUrl("/bomb"), signal: signal(), limits: { maxBytes: 1_000_000 } });
    expect(res.truncated).toBe("decompressed_limit");
    expect(res.bytes).toBe(1_000_000);
    expect(res.compressedBytes).toBeLessThan(100_000);
  });

  it("decodes gzip and legacy charsets", async () => {
    const gz = await fetchViaHttp(client(), localUrl("/gzip-html"), signal());
    expect(gz.extracted.markdown).toContain("compressed body text");
    const latin = await fetchViaHttp(client(), localUrl("/latin1"), signal());
    expect(latin.extracted.markdown).toContain("Café crème");
  });

  // Real clock on purpose: exercises the AbortSignal deadline wiring through Undici.
  it("enforces the deadline", async () => {
    const started = Date.now();
    expect(await codeOf(client().fetch({ url: localUrl("/slow"), signal: signal(300) }).then((r) => r.body))).toBe("timeout");
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it("reports non-2xx responses as structured http_error", async () => {
    const err = await fetchViaHttp(client(), localUrl("/500"), signal()).catch((e: FetchkeepError) => e);
    expect(err).toBeInstanceOf(FetchkeepError);
    expect((err as FetchkeepError).code).toBe("http_error");
    expect((err as FetchkeepError).retryable).toBe(true);
    expect((err as FetchkeepError).details?.status).toBe(500);
  });
});

describe("no script execution", () => {
  it("parses HTML without running page scripts", async () => {
    const page = await fetchViaHttp(client(), localUrl("/script"), signal());
    expect(page.extracted.title).toBe("Original");
    expect(page.extracted.markdown).toContain("Static paragraph that should survive.");
    expect(page.extracted.markdown).not.toMatch(/INJECTED|WRITTEN|Hacked/);
  });
});
