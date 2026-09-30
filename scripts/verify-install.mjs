#!/usr/bin/env node
// Clean-environment install check used before releases:
//   npm pack && node scripts/verify-install.mjs fetchkeep-<version>.tgz
// Installs the tarball into an empty temporary project with an empty FETCHKEEP_HOME, then verifies that a new user
// can (1) run doctor without any browser, (2) fetch and save a static page, (3) read and search it offline and
// (4) complete an MCP handshake and tool listing over stdio.
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

const tarball = process.argv[2];
if (!tarball || !existsSync(tarball)) {
  console.error("usage: node scripts/verify-install.mjs <fetchkeep-x.y.z.tgz>");
  process.exit(2);
}
const dir = mkdtempSync(join(tmpdir(), "fk-install-"));
const home = join(dir, "home");
const npmCli = process.env.npm_execpath;
const npm = (args) =>
  npmCli
    ? execFileSync(process.execPath, [npmCli, ...args], { cwd: dir, stdio: "ignore" })
    : execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", args, { cwd: dir, stdio: "ignore", shell: process.platform === "win32" });
const bin = join(dir, "node_modules", "fetchkeep", "dist", "src", "cli", "main.js");
const env = { ...process.env, FETCHKEEP_HOME: home };
delete env.FETCHKEEP_CHROMIUM;
delete env.FETCHKEEP_LIGHTPANDA_EXECUTABLE;
delete env.FETCHKEEP_LIGHTPANDA_ENDPOINT;
const fk = (...args) => JSON.parse(execFileSync(process.execPath, [bin, "--json", ...args], { env, encoding: "utf8" }));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.error(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

try {
  npm(["init", "-y"]);
  npm(["install", "--no-audit", "--no-fund", resolve(tarball)]);
  check("installed without browser libraries", !existsSync(join(dir, "node_modules", "playwright-core")) && !existsSync(join(dir, "node_modules", "puppeteer-core")));

  const doctor = fk("doctor");
  const browsers = doctor.data.checks.filter((c) => c.name.startsWith("browser:"));
  check("doctor passes", doctor.status === "success", doctor.data.checks.map((c) => `${c.name}:${c.ok ? "ok" : "FAIL"}`).join(" "));
  check("no browser required", browsers.every((c) => c.ok && /disabled/.test(c.detail)));

  const fetched = fk("fetch", "https://example.com/");
  check("fetch + save static page", fetched.status === "success" && fetched.document?.saved === true, fetched.document?.ref ?? JSON.stringify(fetched.error));

  const read = fk("read", "https://example.com/", "--find", "documentation examples");
  check("read offline with exact quote", read.status === "success" && read.data.matches.length > 0, read.data?.matches?.[0]?.citation?.ref ?? "");

  const search = fk("search", "domain");
  check("offline search", search.status === "success" && search.data.results.length > 0, `${search.data.results.length} results`);

  const child = spawn(process.execPath, [bin, "mcp"], { env, stdio: ["pipe", "pipe", "pipe"] });
  const lines = [];
  const rl = createInterface({ input: child.stdout });
  const replies = new Map();
  rl.on("line", (l) => {
    lines.push(l);
    const m = JSON.parse(l);
    if (m.id) replies.set(m.id, m);
  });
  const send = (m) => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...m })}\n`);
  send({ id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "verify", version: "0" } } });
  send({ method: "notifications/initialized" });
  send({ id: 2, method: "tools/list", params: {} });
  const deadline = Date.now() + 15_000;
  while (!replies.has(2) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
  const exited = once(child, "exit");
  child.stdin.end();
  await exited;
  const tools = replies.get(2)?.result?.tools?.map((t) => t.name) ?? [];
  check("MCP handshake + tools/list", tools.includes("web_fetch") && tools.includes("web_read") && tools.includes("web_search"), tools.join(", "));
  check("MCP stdout is JSON-RPC only", lines.every((l) => JSON.parse(l).jsonrpc === "2.0"), `${lines.length} lines`);
} catch (err) {
  check("unexpected error", false, String(err?.message ?? err));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
const failed = results.filter((r) => !r.ok);
console.error(`${results.length - failed.length}/${results.length} checks passed on ${process.platform} ${process.version}`);
process.exit(failed.length ? 1 : 0);
