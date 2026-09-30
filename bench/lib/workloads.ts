import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { platform, release } from "node:os";
import { FetchkeepAdapter, type FetchkeepEnvelope as Envelope } from "../engines/fetchkeep.ts";
import { citationVerified, type CitationMatch } from "./citation.ts";
import { makeAdapter } from "./runner.ts";
import { clusterEstimate, type Estimate } from "./statistics.ts";
import type { EngineAdapter, EngineInfo, FetchOutput } from "./types.ts";

export interface WorkloadOptions {
  profiles: string[];
  repetitions: number;
  operations: number;
  timeoutMs: number;
  bind: string;
  advertise: string;
  out: string;
  command: string;
}
interface Operation {
  name: string;
  tool: string;
  args: Record<string, unknown>;
  latencyMs: number;
  ok: boolean;
  checks: Record<string, boolean>;
  raw: unknown;
  error?: string;
}
interface RequestEvidence { url: string; at: string; version: number; userAgent: string }
interface WorkloadRecord {
  scenario: "session-fetch" | "saved-library";
  profile: string;
  repetition: number;
  outcome: "ok" | "error" | "unavailable" | "na";
  reason?: string;
  readyMs: number | null;
  /** Sum of measured tool-call wall times; excludes verification, fixture control and output writes. */
  operationTotalMs: number | null;
  operations: Operation[];
  requests: RequestEvidence[];
  evidence: Record<string, unknown>;
}
interface WorkloadResult {
  startedAt: string;
  finishedAt: string;
  command: string;
  options: WorkloadOptions;
  environment: Record<string, string>;
  engines: EngineInfo[];
  notes: string[];
  records: WorkloadRecord[];
}

interface WorkloadServer {
  readonly origin: string;
  requests: RequestEvidence[];
  quote(version: number): string;
  sessionPassage(path: string): string;
  start(): Promise<void>;
  stop(): Promise<void>;
  setVersion(version: number): void;
}

/** Dedicated controllable fixture: unique session URLs, no-store responses, explicit server-side request evidence. */
async function workloadServer(bind: string, advertise: string) {
  const requests: RequestEvidence[] = [];
  let version = 1;
  let server: Server | undefined;
  let port = 0;
  const quote = (v: number) => v === 1 ? "The amber heron survey counted seventeen nesting pairs." : "The amber heron survey counted twenty-three nesting pairs.";
  const sessionPassage = (path: string) => `The estuary field station records a unique sample for ${path.slice(1).replaceAll("/", "-")}.`;
  const start = async () => {
    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://workload.local");
      requests.push({ url: url.pathname, at: new Date().toISOString(), version, userAgent: String(req.headers["user-agent"] ?? "") });
      if (url.pathname === "/robots.txt") {
        res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" }).end("User-agent: *\nAllow: /\n");
        return;
      }
      if (!/^\/(session|library)\//.test(url.pathname)) { res.writeHead(404).end(); return; }
      const passage = url.pathname.startsWith("/library/") ? quote(version) : sessionPassage(url.pathname);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(
        `<!doctype html><html lang="en"><head><title>Estuary field station</title></head><body><main><h1>Estuary field station</h1>` +
        `<p>${passage}</p><p>Researchers record the water level at dawn and compare each measurement with the previous week's log. The observation book preserves both the original measurement and later corrections.</p>` +
        `<h2>Observation method</h2><p>The team checks the reference staff before each survey. Wind direction, cloud cover and instrument calibration are recorded separately so the published counts can be reviewed.</p>` +
        `<ul><li>Record the first observation before sunrise.</li><li>Keep original field notes for verification.</li><li>Publish revisions without replacing earlier observations.</li></ul>` +
        `<h2>Instrument settings</h2><table><thead><tr><th>Instrument</th><th>Interval</th></tr></thead><tbody><tr><td>Water gauge</td><td>15 minutes</td></tr><tr><td>Wind vane</td><td>30 minutes</td></tr></tbody></table>` +
        `<p>The field station shares these results with neighboring conservation teams. Every saved report should retain enough context to identify the measurement and the method used to collect it.</p></main></body></html>`,
      );
    });
    const listening = once(server, "listening");
    server.listen(port, bind);
    await listening;
    port = (server.address() as AddressInfo).port;
  };
  const stop = async () => {
    if (!server) return;
    const closed = once(server, "close");
    server.closeAllConnections();
    server.close();
    await closed;
    server = undefined;
  };
  await start();
  return { get origin() { return `http://${advertise}:${port}`; }, requests, quote, sessionPassage, start, stop, setVersion(v: number) { version = v; } };
}

async function measure<T>(record: WorkloadRecord, name: string, tool: string, args: Record<string, unknown>, call: () => Promise<T>, check: (value: T) => Record<string, boolean>): Promise<T | undefined> {
  const began = performance.now();
  let value: T;
  try { value = await call(); }
  catch (error) {
    record.operations.push({ name, tool, args, latencyMs: performance.now() - began, ok: false, checks: {}, raw: null, error: String(error) });
    return undefined;
  }
  const latencyMs = performance.now() - began;
  const checks = check(value);
  record.operations.push({ name, tool, args, latencyMs, ok: Object.values(checks).every(Boolean), checks, raw: value });
  return value;
}

async function sessionScenario(adapter: EngineAdapter, record: WorkloadRecord, server: WorkloadServer, opts: WorkloadOptions) {
  for (let operation = 1; operation <= opts.operations; operation++) {
    // Both engines visit exactly the same new URL once; neither receives a saved-read/cache shortcut.
    const path = `/session/r${record.repetition}/operation-${operation}`;
    const url = `${server.origin}${path}`;
    const before = server.requests.length;
    await measure(record, `fetch-${operation}`, "web_fetch", { url, timeoutMs: opts.timeoutMs }, () => adapter.fetch(url, opts.timeoutMs), (out) => ({
      success: out.ok,
      passage: out.markdown.includes(server.sessionPassage(path)),
      originContacted: server.requests.slice(before).some((r) => r.url === path),
    }));
  }
}

async function libraryScenario(adapter: FetchkeepAdapter, record: WorkloadRecord, server: WorkloadServer, opts: WorkloadOptions) {
  const path = `/library/r${record.repetition}/survey`;
  const url = `${server.origin}${path}`;
  const quote = server.quote(1);
  let before = server.requests.length;
  const first = await measure(record, "fetch-and-save", "web_fetch", { url }, () => adapter.fetch(url, opts.timeoutMs), (out) => ({
    success: out.ok, passage: out.markdown.includes(quote), savedRef: !!out.citationRef,
    originContacted: server.requests.slice(before).some((r) => r.url === path),
  }));
  if (!first?.citationRef) { record.evidence.blockedAt = "fetch-and-save did not return a saved reference"; return; }
  const firstEnvelope = first.raw as Envelope;
  const read = async (name: string, args: Record<string, unknown>, check: (env: Envelope | undefined) => Record<string, boolean>) =>
    measure(record, name, "web_read", args, () => adapter.callTool("web_read", args, opts.timeoutMs), (res) => check(res.structured as unknown as Envelope | undefined));
  const found = await read("exact-quote-lookup", { target: first.citationRef, find: quote }, (env) => ({
    success: env?.status === "success", exactQuote: (env?.data?.matches as CitationMatch[] | undefined)?.some((m) => m.quote === quote) ?? false,
  }));
  const match = ((found?.structured as unknown as Envelope | undefined)?.data?.matches as CitationMatch[] | undefined)?.find((m) => m.quote === quote);
  if (!match) { record.evidence.blockedAt = "exact quote lookup did not return a citation"; return; }
  record.evidence.originalCitation = match.citation;
  await read("reopen-citation", { target: match.citation.ref }, (env) => ({ exactSourceAndIdentity: citationVerified(match, env, quote) }));

  await server.stop();
  let offline = false;
  try { await fetch(url, { signal: AbortSignal.timeout(1500) }); } catch { offline = true; }
  record.evidence.originStoppedBeforeSearch = offline;
  record.evidence.originStoppedAt = new Date().toISOString();
  before = server.requests.length;
  await measure(record, "offline-local-search", "web_search", { query: "amber heron", source: "local", target: first.citationRef },
    () => adapter.callTool("web_search", { query: "amber heron", source: "local", target: first.citationRef }, opts.timeoutMs), (res) => {
      const env = res.structured as unknown as Envelope | undefined;
      const hits = env?.data?.results as { ref?: string; version?: number }[] | undefined;
      return { success: env?.status === "success", localSource: env?.data?.source === "local", serverStopped: offline,
        foundSavedVersion: hits?.some((hit) => hit.ref === match.citation.ref && hit.version === match.citation.version) ?? false,
        noOriginRequests: server.requests.length === before };
    });
  server.setVersion(2);
  await server.start();
  before = server.requests.length;
  await measure(record, "fetch-new-version", "web_fetch", { url }, () => adapter.fetch(url, opts.timeoutMs), (out: FetchOutput) => {
    const env = out.raw as Envelope;
    return { success: out.ok, revisedPassage: out.markdown.includes(server.quote(2)), oldPassageAbsent: !out.markdown.includes(quote),
      newSavedVersion: !!env?.document && env.document.id === firstEnvelope.document?.id && env.document.version > (firstEnvelope.document?.version ?? Infinity),
      originContacted: server.requests.slice(before).some((r) => r.url === path && r.version === 2) };
  });
  await server.stop();
  await read("reopen-old-citation-after-update", { target: match.citation.ref }, (env) => ({
    originalSourceAndIdentity: citationVerified(match, env, quote), newerTextAbsent: !env?.content?.text.includes(server.quote(2)),
  }));
}

export async function runWorkloads(opts: WorkloadOptions): Promise<string> {
  if (!Number.isSafeInteger(opts.repetitions) || opts.repetitions < 1 || !Number.isSafeInteger(opts.operations) || opts.operations < 2) throw new Error("repetitions must be positive; operations must be at least 2");
  if (!opts.profiles.length || opts.profiles.some((p) => !["fetchkeep-http", "fetchkeep-auto", "fetchkeep-chromium", "fetchkeep-lightpanda", "donsetch"].includes(p))) throw new Error("workloads support Fetchkeep profiles and donsetch only");
  mkdirSync(dirname(opts.out), { recursive: true });
  mkdirSync(opts.out, { recursive: false });
  const result: WorkloadResult = {
    startedAt: new Date().toISOString(), finishedAt: "", command: opts.command, options: opts,
    environment: { node: process.version, os: `${platform()} ${release()}` }, engines: [], records: [],
    notes: [
      "Separate scenarios, not inputs to the common-fetch ranking. No LLM judge.",
      "Session-fetch starts a fresh persistent MCP process per profile/repetition; all operations are real web_fetch calls to the same unique per-operation URLs for both engines. Responses use no-store and every operation must produce server-side request evidence.",
      "The saved-library scenario is Fetchkeep-specific; unsupported DonSeTch library operations are N/A, not failures or zero latency. Persistence remains enabled.",
      "Operation times measure MCP calls only. Startup is separate; server stop/restart, assertions, and report writes are outside operation totals. Full raw MCP responses and server request logs are retained here.",
      "Each scenario is one workload case. Repetitions are repeated sessions, not independent cases: case-cluster uncertainty is N/A for this one-case workload, regardless of repetitions.",
    ],
  };
  const save = () => writeFileSync(join(opts.out, "workloads.json"), JSON.stringify(result, null, 2) + "\n");
  for (let repetition = 1; repetition <= opts.repetitions; repetition++) {
    const profiles = repetition % 2 ? opts.profiles : [...opts.profiles].reverse();
    // One origin shared by competitors in this repetition, so URL identity and payloads match.
    for (const scenario of ["session-fetch", "saved-library"] as const) {
      const server = await workloadServer(opts.bind, opts.advertise);
      try {
        for (const profile of profiles) {
          const record: WorkloadRecord = { scenario, profile, repetition, outcome: "ok", readyMs: null, operationTotalMs: null, operations: [], requests: [], evidence: {} };
          result.records.push(record);
          if (scenario === "saved-library" && profile === "donsetch") {
            record.outcome = "na";
            record.reason = "DonSeTch adapter exposes fetch/crawl, not versioned saved-document read, exact citation reopen or offline library search";
            save();
            continue;
          }
          const adapter = makeAdapter(profile, join(opts.out, "state", scenario, `r${repetition}`), { allowPaid: false, budgetCredits: 0 }, `${opts.advertise}/32`);
          const requestOffset = server.requests.length;
          try {
            if (!result.engines.some((e) => e.profile === profile)) result.engines.push(await adapter.info());
            const availability = await adapter.availability();
            if (!availability.available) { record.outcome = "unavailable"; record.reason = availability.reason ?? "engine unavailable"; continue; }
            record.readyMs = (await adapter.start()).readyMs;
            if (scenario === "session-fetch") await sessionScenario(adapter, record, server, opts);
            else {
              // A prior Fetchkeep profile closed the origin; restore the initial payload for this profile.
              await server.stop();
              server.setVersion(1);
              await server.start();
              await libraryScenario(adapter as FetchkeepAdapter, record, server, opts);
            }
            record.operationTotalMs = record.operations.reduce((sum, op) => sum + op.latencyMs, 0);
            record.outcome = record.operations.length === (scenario === "session-fetch" ? opts.operations : 6) && record.operations.every((op) => op.ok) ? "ok" : "error";
          } catch (error) { record.outcome = "error"; record.reason = String(error); }
          finally {
            record.requests = server.requests.slice(requestOffset);
            await adapter.stop();
            save();
          }
        }
      } finally { await server.stop(); }
    }
  }
  result.finishedAt = new Date().toISOString();
  save();
  writeFileSync(join(opts.out, "workloads.md"), renderWorkloads(result));
  return opts.out;
}

function renderWorkloads(result: WorkloadResult): string {
  const cell = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
  const estimate = (e: Estimate) => e.value === null ? "N/A" : `${e.value.toFixed(1)} ms (n=${e.attempts}; case-cluster CI N/A)`;
  const lines = ["# Session and saved-library workloads", "", `Command: \`${result.command}\``, "", ...result.notes.map((note) => `- ${note}`), "",
    "## Scenario results", "", "| Scenario | Profile | Sessions ok / attempted | N/A / unavailable | Successful operation-total p50 | MCP-ready p50 |", "| --- | --- | --- | --- | --- | --- |"];
  for (const scenario of ["session-fetch", "saved-library"] as const) for (const profile of result.options.profiles) {
    const rows = result.records.filter((r) => r.scenario === scenario && r.profile === profile);
    const ran = rows.filter((r) => r.outcome === "ok" || r.outcome === "error");
    const metric = (key: "operationTotalMs" | "readyMs") => clusterEstimate(ran.flatMap((r) => r[key] === null || (key === "operationTotalMs" && r.outcome !== "ok") ? [] : [{ caseId: scenario, value: r[key]! }]), "p50");
    lines.push(`| ${scenario} | ${profile} | ${ran.filter((r) => r.outcome === "ok").length} / ${ran.length} | ${rows.filter((r) => r.outcome === "na").length} / ${rows.filter((r) => r.outcome === "unavailable").length} | ${estimate(metric("operationTotalMs"))} | ${estimate(metric("readyMs"))} |`);
  }
  lines.push("", "## Every operation", "", "| Scenario | Profile | Repetition | Operation | Outcome | Wall ms | Failed checks / reason |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const record of result.records) {
    if (!record.operations.length) lines.push(`| ${record.scenario} | ${record.profile} | ${record.repetition} | N/A | ${record.outcome} | N/A | ${cell(record.reason ?? "")} |`);
    for (const op of record.operations) lines.push(`| ${record.scenario} | ${record.profile} | ${record.repetition} | ${op.name} | ${op.ok ? "ok" : "error"} | ${op.latencyMs.toFixed(1)} | ${cell(op.error ?? Object.entries(op.checks).filter(([, pass]) => !pass).map(([name]) => name).join(", "))} |`);
  }
  lines.push("", "Full evidence: [workloads.json](workloads.json). Includes every raw response, normalized operation arguments, request log, identity check and engine configuration. Fetch adapter source defines engine-specific MCP parameter names.", "");
  return lines.join("\n");
}
