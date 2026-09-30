import { once } from "node:events";
import { readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("../fixtures/site/", import.meta.url));

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".png": "image/png",
};

/** windows-1252 encoder for the handful of non-ASCII characters used by the encoding fixture. */
function cp1252(text: string): Buffer {
  const special: Record<string, number> = { "€": 0x80 };
  return Buffer.from([...text].map((ch) => special[ch] ?? ch.charCodeAt(0)));
}

const LATIN1_PAGE =
  "<!doctype html><html><head><title>Menu du jour</title></head><body><main><h1>Menu du jour</h1>" +
  "<p>Crème brûlée is served at the café on the quay every Friday.</p><p>A slice of tarte costs €4 with coffee.</p></main></body></html>";

export interface FixtureServer {
  /** Base URL advertised to engines, e.g. `http://172.31.172.243:8765`. */
  origin: string;
  port: number;
  requests: { path: string; ua: string; at: number }[];
  close(): Promise<void>;
}

/**
 * Serves bench/fixtures/site plus dynamic behaviours (robots.txt, redirects, errors, slow responses, legacy
 * encodings). `host` is the bind address; `advertise` is the hostname put in URLs (must be reachable by every engine,
 * including containers).
 */
export async function startFixtureServer(opts: { host?: string; advertise?: string; port?: number } = {}): Promise<FixtureServer> {
  const requests: FixtureServer["requests"] = [];
  let origin = "";
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://fixture.local");
    const path = url.pathname;
    requests.push({ path, ua: String(req.headers["user-agent"] ?? ""), at: Date.now() });
    const redirect = (to: string, code = 301) => void res.writeHead(code, { location: to }).end();

    if (path === "/robots.txt") {
      res.writeHead(200, { "content-type": "text/plain" }).end(`User-agent: *\nDisallow: /crawl/private/\n\nSitemap: ${origin}/crawl/sitemap.xml\n`);
      return;
    }
    if (path === "/go/old-tide") return redirect("/go/older-tide", 301);
    if (path === "/go/older-tide") return redirect("/articles/tide-gauge.html", 302);
    if (path === "/crawl/tides/old-tables") return redirect("/crawl/tides/tables.html", 301);
    if (path === "/loop/a") return redirect("/loop/b", 302);
    if (path === "/loop/b") return redirect("/loop/a", 302);
    if (path === "/fail/500") {
      res.writeHead(500, { "content-type": "text/html" }).end("<h1>Internal Server Error</h1>");
      return;
    }
    if (path === "/enc/latin1.html") {
      res.writeHead(200, { "content-type": "text/html; charset=windows-1252" }).end(cp1252(LATIN1_PAGE));
      return;
    }
    const slow = /^\/slow\/(\d{1,5})$/.exec(path);
    if (slow) {
      setTimeout(() => {
        res
          .writeHead(200, { "content-type": "text/html; charset=utf-8" })
          .end(`<!doctype html><html><head><title>Slow page</title></head><body><main><h1>Slow page</h1><p>This page was deliberately slow to respond, by ${slow[1]} milliseconds.</p></main></body></html>`);
      }, Number(slow[1]));
      return;
    }

    let file = normalize(join(SITE, decodeURIComponent(path)));
    if (!file.startsWith(normalize(SITE))) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (statSync(file).isDirectory()) file = join(file, "index.html");
      let body: Buffer = readFileSync(file);
      if (path === "/crawl/sitemap.xml") body = Buffer.from(body.toString("utf8").replaceAll("__ORIGIN__", origin));
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "content-length": body.length }).end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/html" }).end("<!doctype html><html><head><title>Not found</title></head><body><h1>404 Not Found</h1></body></html>");
    }
  });
  const listening = once(server, "listening");
  server.listen(opts.port ?? 0, opts.host ?? "127.0.0.1");
  await listening;
  const port = (server.address() as AddressInfo).port;
  origin = `http://${opts.advertise ?? opts.host ?? "127.0.0.1"}:${port}`;
  return {
    origin,
    port,
    requests,
    close: async () => {
      const closed = once(server, "close");
      server.closeAllConnections();
      server.close();
      await closed;
    },
  };
}

// Standalone: `node bench/lib/fixture-server.ts [--host 0.0.0.0] [--advertise 172.x.x.x] [--port 8765]`
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const port = arg("port");
  const s = await startFixtureServer({ host: arg("host") ?? "127.0.0.1", ...(arg("advertise") ? { advertise: arg("advertise")! } : {}), ...(port ? { port: Number(port) } : {}) });
  console.error(`fixture server at ${s.origin}`);
}
