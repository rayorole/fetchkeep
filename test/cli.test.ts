import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Envelope } from "../src/core/schema.js";
import { html, startServer, type TestServer } from "./support/server.js";
import { tempHome } from "./support/service.js";

const run = promisify(execFile);
const CLI = new URL("../dist/src/cli/main.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
let srv: TestServer;
const { home, cleanup } = tempHome();

beforeAll(async () => {
  srv = await startServer({
    "/a": html("<html><head><title>CLI page</title></head><body><main><h1>Badgers</h1><p>Badgers dig setts.</p></main></body></html>"),
  });
});
afterAll(async () => {
  await srv.close();
  cleanup();
});

async function cli(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run(process.execPath, [CLI, "--home", home, "--allow-host", "localhost", ...args], { env: { ...process.env, FETCHKEEP_HOME: "" } });
    return { code: 0, stdout, stderr };
  } catch (e) {
    const err = e as { code: number; stdout: string; stderr: string };
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

describe("CLI", () => {
  it("prints Markdown on stdout and metadata on stderr", async () => {
    const r = await cli("fetch", `http://localhost:${srv.port}/a`);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("# Badgers\n\nBadgers dig setts.\n");
    expect(r.stderr).toMatch(/ref: fk:d_[0-9a-f]{16}@1/);
  });

  it("emits the same envelope as MCP with --json and reads offline", async () => {
    const r = await cli("--json", "read", `http://localhost:${srv.port}/a`, "--find", "dig setts");
    const env = Envelope.parse(JSON.parse(r.stdout));
    expect(env.tool).toBe("web_read");
    expect((env.data as { matches: { quote: string }[] }).matches[0]!.quote).toBe("dig setts");
    const s = Envelope.parse(JSON.parse((await cli("--json", "search", "badgers")).stdout));
    expect((s.data as { results: { title: string }[] }).results.map((x) => x.title)).toEqual(["CLI page", "CLI page"]);
  });

  it("uses exit code 1 for errors and 2 for usage errors", async () => {
    const blocked = await cli("--json", "fetch", "http://127.0.0.1:9/");
    expect(blocked.code).toBe(1);
    expect(Envelope.parse(JSON.parse(blocked.stdout)).error?.code).toBe("blocked_by_policy");
    expect((await cli("fetch", "--mode", "nope", "http://x")).code).toBe(2);
  });

  it("exports JSON Lines and deletes documents", async () => {
    const exp = await cli("export");
    const lines = exp.stdout.trim().split("\n").map((l) => JSON.parse(l) as { finalUrl: string; blocks: unknown[] });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.blocks.length).toBeGreaterThan(0);
    const del = await cli("--json", "delete", `http://localhost:${srv.port}/a`);
    expect(JSON.parse(del.stdout).data.deleted).toHaveLength(1);
    expect((await cli("read", `http://localhost:${srv.port}/a`)).code).toBe(1);
  });
});
