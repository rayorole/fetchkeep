import { DatabaseSync } from "node:sqlite";
import type { Envelope } from "../core/schema.js";
import type { Fetchkeep } from "../core/service.js";
import { VERSION } from "../version.js";

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export async function runDoctor(fk: Fetchkeep): Promise<Envelope> {
  const checks: Check[] = [];
  const [major, minor] = process.versions.node.split(".").map(Number) as [number, number];
  checks.push({
    name: "node",
    ok: major > 22 || (major === 22 && minor >= 19),
    detail: `Node.js ${process.versions.node} (requires >= 22.19)`,
  });
  try {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE VIRTUAL TABLE t USING fts5(x)");
    db.close();
    checks.push({ name: "sqlite", ok: true, detail: `SQLite ${process.versions.sqlite ?? "?"} with FTS5` });
  } catch (err) {
    checks.push({ name: "sqlite", ok: false, detail: `node:sqlite/FTS5 unavailable: ${(err as Error).message}` });
  }
  try {
    const n = fk.store.countDocuments();
    checks.push({ name: "store", ok: true, detail: `${fk.store.path} (${n} documents, workspace "${fk.config.workspace}")` });
  } catch (err) {
    checks.push({ name: "store", ok: false, detail: (err as Error).message });
  }
  const net = fk.config.network;
  checks.push({
    name: "network-policy",
    ok: true,
    detail: net.allowPrivateNetwork
      ? "private network access ALLOWED (allowPrivateNetwork=true)"
      : `private network blocked${net.allowHosts.length ? `; allowed hosts: ${net.allowHosts.join(", ")}` : ""}${net.allowCidrs.length ? `; allowed CIDRs: ${net.allowCidrs.join(", ")}` : ""}`,
  });
  checks.push({
    name: "web-search",
    ok: true,
    detail: fk.config.search.searxng ? `SearXNG at ${fk.config.search.searxng.url}` : "not configured (optional; local search always works)",
  });
  checks.push({
    name: "ollama",
    ok: true,
    detail: fk.config.ollama.model ? `${fk.config.ollama.url} model ${fk.config.ollama.model}` : "not configured (optional)",
  });
  const failed = checks.filter((c) => !c.ok);
  return {
    status: failed.length ? "error" : "success",
    tool: "doctor",
    data: { version: VERSION, platform: `${process.platform}-${process.arch}`, checks },
    timings: {},
    warnings: [],
    ...(failed.length ? { error: { code: "internal", message: failed.map((c) => `${c.name}: ${c.detail}`).join("; "), retryable: false } } : {}),
  };
}
