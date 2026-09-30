import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Fetchkeep } from "../core/service.js";
import { createMcpServer } from "../mcp/server.js";

/**
 * Runs the MCP server over stdio. stdout is reserved for JSON-RPC: every console method is redirected to stderr
 * before the service is created, so no library can corrupt the protocol stream.
 */
export async function runMcpStdio(makeService: () => Promise<Fetchkeep>): Promise<void> {
  const toStderr = (...args: unknown[]) => process.stderr.write(`${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}\n`);
  console.log = toStderr;
  console.info = toStderr;
  console.debug = toStderr;
  console.warn = toStderr;

  const fk = await makeService();
  const server = createMcpServer(fk);
  const transport = new StdioServerTransport();
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await server.close().catch(() => undefined);
    await fk.close().catch(() => undefined);
    process.exit(0);
  };
  process.stdin.on("end", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  await server.connect(transport);
  process.stderr.write(`fetchkeep MCP server ready (workspace "${fk.config.workspace}", store ${fk.config.home})\n`);
}
