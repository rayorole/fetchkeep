import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export type Handler = (req: IncomingMessage, res: ServerResponse, url: URL) => void | Promise<void>;

export interface TestServer {
  /** Base URL using 127.0.0.1. */
  url: string;
  port: number;
  hits: Map<string, number>;
  close(): Promise<void>;
}

export async function startServer(routes: Record<string, Handler>): Promise<TestServer> {
  const hits = new Map<string, number>();
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    hits.set(url.pathname, (hits.get(url.pathname) ?? 0) + 1);
    const handler = routes[url.pathname];
    if (!handler) {
      res.writeHead(404, { "content-type": "text/html" }).end("<h1>Not found</h1>");
      return;
    }
    Promise.resolve(handler(req, res, url)).catch((err: unknown) => {
      res.writeHead(500).end(String(err));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    hits,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export const html = (body: string, status = 200, headers: Record<string, string> = {}): Handler => (_req, res) => {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", ...headers }).end(body);
};
