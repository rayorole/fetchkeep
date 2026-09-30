import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpResult {
  text: string;
  structured: Record<string, unknown> | undefined;
  isError: boolean;
}

/** A persistent MCP stdio session to an engine (Fetchkeep and DonSeTch both expose MCP servers). */
export class McpSession {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  stderr = "";

  private readonly command: string;
  private readonly args: string[];
  private readonly env: Record<string, string>;

  constructor(command: string, args: string[], env: Record<string, string>) {
    this.command = command;
    this.args = args;
    this.env = env;
  }

  get pid(): number | null {
    return this.transport?.pid ?? null;
  }

  async start(): Promise<number> {
    const t0 = performance.now();
    this.transport = new StdioClientTransport({ command: this.command, args: this.args, env: this.env, stderr: "pipe" });
    this.transport.stderr?.on("data", (d: Buffer) => {
      this.stderr = (this.stderr + d.toString()).slice(-20_000);
    });
    this.client = new Client({ name: "fetchkeep-bench", version: "1.0.0" });
    await this.client.connect(this.transport);
    await this.client.listTools();
    return performance.now() - t0;
  }

  async call(name: string, args: Record<string, unknown>, timeoutMs: number): Promise<McpResult> {
    if (!this.client) throw new Error("MCP session not started");
    const res = await this.client.callTool({ name, arguments: args }, undefined, { timeout: timeoutMs, maxTotalTimeout: timeoutMs });
    const content = (res.content ?? []) as { type: string; text?: string }[];
    return {
      text: content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n"),
      structured: res.structuredContent as Record<string, unknown> | undefined,
      isError: res.isError === true,
    };
  }

  async listTools(): Promise<string[]> {
    return (await this.client!.listTools()).tools.map((t) => t.name);
  }

  async stop(): Promise<void> {
    await this.client?.close().catch(() => undefined);
    this.client = null;
    this.transport = null;
  }
}
