#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { Command, InvalidArgumentError, Option } from "commander";
import { loadConfig, type ConfigOverrides } from "../core/config.js";
import { FetchkeepError } from "../core/errors.js";
import { FETCH_MODES } from "../core/schema.js";
import type { Envelope, FetchMode } from "../core/schema.js";
import { Fetchkeep } from "../core/service.js";
import { renderEnvelope } from "../mcp/render.js";
import { VERSION } from "../version.js";
import { runDoctor } from "./doctor.js";
import { runMcpStdio } from "./mcp.js";

interface GlobalOpts {
  home?: string;
  workspace?: string;
  config?: string;
  allowPrivateNetwork?: boolean;
  allowHost?: string[];
  json?: boolean;
}

const int = (name: string) => (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new InvalidArgumentError(`${name} must be a non-negative integer`);
  return n;
};
const collect = (v: string, prev: string[] = []) => [...prev, v];

/** Exit codes: 0 success, 1 error, 2 usage error, 3 partial result. */
function exitCodeFor(env: Envelope): number {
  return env.status === "success" ? 0 : env.status === "partial" ? 3 : 1;
}

function makeService(opts: GlobalOpts): Fetchkeep {
  const overrides: ConfigOverrides = {};
  if (opts.home) overrides.home = opts.home;
  if (opts.workspace) overrides.workspace = opts.workspace;
  const network: NonNullable<ConfigOverrides["network"]> = {};
  if (opts.allowPrivateNetwork) network.allowPrivateNetwork = true;
  if (opts.allowHost?.length) network.allowHosts = opts.allowHost;
  if (Object.keys(network).length) overrides.network = network;
  return new Fetchkeep(loadConfig({ ...(opts.config ? { configPath: opts.config } : {}), overrides }));
}

function print(env: Envelope, json: boolean | undefined): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(env)}\n`);
    return;
  }
  // Human mode: content on stdout, metadata on stderr, so `fetchkeep fetch URL > page.md` works.
  const meta = renderEnvelope({ ...env, content: undefined } as Envelope);
  process.stderr.write(`${meta}\n`);
  if (env.content?.text) process.stdout.write(`${env.content.text}\n`);
}

async function run(opts: GlobalOpts, fn: (fk: Fetchkeep, signal: AbortSignal) => Promise<Envelope> | Envelope): Promise<void> {
  let fk: Fetchkeep | null = null;
  let env: Envelope;
  try {
    fk = makeService(opts);
    const ac = new AbortController();
    process.once("SIGINT", () => ac.abort(new FetchkeepError("cancelled", "Interrupted")));
    env = await fn(fk, ac.signal);
  } catch (err) {
    const e = err instanceof FetchkeepError ? err : new FetchkeepError("internal", (err as Error).message, { cause: err });
    env = { status: "error", tool: "cli", timings: {}, warnings: [], error: e.toInfo() };
  } finally {
    await fk?.close();
  }
  print(env, opts.json);
  process.exitCode = exitCodeFor(env);
}

export function buildProgram(): Command {
  const program = new Command()
    .name("fetchkeep")
    .description("The web, saved for your agents. Fetch, extract, save, search, crawl and cite web content.")
    .version(VERSION)
    .option("--home <dir>", "data directory (default: $FETCHKEEP_HOME or ~/.fetchkeep)")
    .option("-w, --workspace <name>", "workspace (isolated store), default: $FETCHKEEP_WORKSPACE or 'default'")
    .option("--config <file>", "config file (default: <home>/config.json if present)")
    .option("--allow-private-network", "allow private/loopback destinations (trusted local use only)")
    .option("--allow-host <host>", "allow a host that resolves to a private address (repeatable, supports *.suffix)", collect)
    .option("--json", "print the JSON envelope on stdout")
    .showHelpAfterError()
    // Set before subcommands are added so they inherit it: usage errors exit with 2.
    .exitOverride((err) => {
      process.exit(err.exitCode === 0 ? 0 : 2);
    })
    .addHelpText(
      "after",
      "\nExit codes: 0 success, 1 error, 2 usage error, 3 partial result.\nDocs: https://github.com/rayorole/fetchkeep#readme",
    );
  const g = () => program.opts<GlobalOpts>();

  program
    .command("fetch")
    .description("fetch a URL, extract Markdown and save it")
    .argument("<url>")
    .addOption(new Option("-m, --mode <mode>", "backend").choices([...FETCH_MODES]).default("auto"))
    .option("-t, --timeout <ms>", "end-to-end deadline", int("timeout"))
    .option("--max-chars <n>", "output budget", int("max-chars"))
    .option("--offset <n>", "start offset in the Markdown", int("offset"))
    .option("--no-save", "do not save to the local store")
    .option("--blocks", "include structured blocks in --json output")
    .action((url: string, o: { mode: FetchMode; timeout?: number; maxChars?: number; offset?: number; save: boolean; blocks?: boolean }) =>
      run(g(), (fk, signal) =>
        fk.fetch({
          url,
          signal,
          mode: o.mode,
          save: o.save,
          ...(o.timeout !== undefined ? { timeoutMs: o.timeout } : {}),
          ...(o.maxChars !== undefined ? { maxChars: o.maxChars } : {}),
          ...(o.offset !== undefined ? { offset: o.offset } : {}),
          ...(o.blocks ? { includeBlocks: true } : {}),
        }),
      ),
    );

  program
    .command("read")
    .description("read a saved document (URL, document id or fk: ref) without refetching")
    .argument("<target>")
    .option("--version <n>", "document version (default: latest)", int("version"))
    .option("--offset <n>", "start offset", int("offset"))
    .option("--max-chars <n>", "output budget", int("max-chars"))
    .option("-b, --blocks <selection>", "blocks to return: b3, b3-b7, b2,b5")
    .option("-f, --find <quote>", "locate an exact quotation")
    .option("--include-blocks", "include structured blocks in --json output")
    .action((target: string, o: { version?: number; offset?: number; maxChars?: number; blocks?: string; find?: string; includeBlocks?: boolean }) =>
      run(g(), (fk) =>
        fk.read({
          target,
          ...(o.version !== undefined ? { version: o.version } : {}),
          ...(o.offset !== undefined ? { offset: o.offset } : {}),
          ...(o.maxChars !== undefined ? { maxChars: o.maxChars } : {}),
          ...(o.blocks ? { blocks: o.blocks } : {}),
          ...(o.find ? { find: o.find } : {}),
          ...(o.includeBlocks ? { includeBlocks: true } : {}),
        }),
      ),
    );

  program
    .command("search")
    .description("search saved documents (offline); --web uses the configured web search provider")
    .argument("<query...>")
    .option("--web", "search the web through the configured provider (e.g. SearXNG)")
    .option("-n, --limit <n>", "maximum results", int("limit"))
    .option("--all-versions", "include older versions")
    .option("--in <target>", "restrict to one saved document")
    .action((words: string[], o: { web?: boolean; limit?: number; allVersions?: boolean; in?: string }) =>
      run(g(), (fk, signal) =>
        fk.search({
          signal,
          query: words.join(" "),
          source: o.web ? "web" : "local",
          ...(o.limit !== undefined ? { limit: o.limit } : {}),
          ...(o.allVersions ? { allVersions: true } : {}),
          ...(o.in ? { target: o.in } : {}),
        }),
      ),
    );

  program
    .command("list")
    .description("list saved documents")
    .option("-n, --limit <n>", "maximum documents", int("limit"), 50)
    .option("--offset <n>", "skip documents", int("offset"), 0)
    .action((o: { limit: number; offset: number }) =>
      run(g(), (fk) => ({
        status: "success",
        tool: "list",
        data: { workspace: fk.config.workspace, total: fk.store.countDocuments(), documents: fk.store.listDocuments(o.limit, o.offset) },
        timings: {},
        warnings: [],
      })),
    );

  program
    .command("versions")
    .description("list versions of a saved document")
    .argument("<target>")
    .action((target: string) =>
      run(g(), (fk) => {
        const id = fk.store.resolveDocId(target);
        if (!id) throw new FetchkeepError("not_found", `No saved document for "${target}"`);
        return { status: "success", tool: "versions", data: { docId: id, versions: fk.store.listVersions(id) }, timings: {}, warnings: [] };
      }),
    );

  program
    .command("export")
    .description("export every stored version as JSON Lines")
    .option("-o, --out <file>", "output file (default: stdout)")
    .option("--include-raw", "include raw source snapshots (base64)")
    .action(async (o: { out?: string; includeRaw?: boolean }) => {
      const fk = makeService(g());
      try {
        const out = o.out ? createWriteStream(o.out) : process.stdout;
        let n = 0;
        for (const rec of fk.store.exportVersions({ includeRaw: Boolean(o.includeRaw) })) {
          if (!out.write(`${JSON.stringify(rec)}\n`)) await once(out, "drain");
          n++;
        }
        if (o.out) {
          const finished = once(out, "finish");
          out.end();
          await finished;
        }
        process.stderr.write(`exported ${n} versions\n`);
      } finally {
        await fk.close();
      }
    });

  program
    .command("delete")
    .description("delete saved documents (all versions, blocks and snapshots)")
    .argument("<targets...>", "URLs, document ids or refs")
    .action((targets: string[]) =>
      run(g(), (fk) => {
        const deleted: string[] = [];
        const missing: string[] = [];
        for (const t of targets) {
          const id = fk.store.resolveDocId(t);
          if (id && fk.store.deleteDocument(id)) deleted.push(id);
          else missing.push(t);
        }
        return {
          status: missing.length ? (deleted.length ? "partial" : "error") : "success",
          tool: "delete",
          data: { deleted, missing },
          timings: {},
          warnings: missing.map((m) => `not found: ${m}`),
          ...(missing.length && !deleted.length ? { error: new FetchkeepError("not_found", "Nothing to delete").toInfo() } : {}),
        };
      }),
    );

  program
    .command("prune")
    .description("apply retention: drop old versions and/or raw snapshots")
    .option("--keep-versions <n>", "keep the newest N versions per document", int("keep-versions"))
    .option("--older-than <age>", "drop non-latest versions older than e.g. 30d, 12h or an ISO date")
    .addOption(new Option("--raw <which>", "drop raw snapshots").choices(["all", "old"]))
    .action((o: { keepVersions?: number; olderThan?: string; raw?: "all" | "old" }) =>
      run(g(), (fk) => {
        if (o.keepVersions === undefined && !o.olderThan && !o.raw) {
          throw new FetchkeepError("invalid_argument", "Specify --keep-versions, --older-than and/or --raw");
        }
        const res = fk.store.prune({
          ...(o.keepVersions !== undefined ? { keepVersions: o.keepVersions } : {}),
          ...(o.olderThan ? { olderThan: parseAge(o.olderThan) } : {}),
          ...(o.raw ? { raw: o.raw } : {}),
        });
        fk.store.db.exec("VACUUM");
        return { status: "success", tool: "prune", data: res, timings: {}, warnings: [] };
      }),
    );

  program
    .command("doctor")
    .description("check the installation, store and optional backends")
    .action(() => run(g(), (fk) => runDoctor(fk)));

  program
    .command("mcp")
    .description("run the MCP server on stdio (stdout carries protocol messages only)")
    .action(() => runMcpStdio(() => makeService(g())));

  return program;
}

export function parseAge(input: string): string {
  const m = /^(\d+)\s*([dhm])$/i.exec(input.trim());
  if (m) {
    const ms = Number(m[1]) * { d: 86_400_000, h: 3_600_000, m: 60_000 }[m[2]!.toLowerCase() as "d" | "h" | "m"];
    return new Date(Date.now() - ms).toISOString();
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new FetchkeepError("invalid_argument", `Invalid age "${input}" (use 30d, 12h, 45m or an ISO date)`);
  return d.toISOString();
}

buildProgram()
  .parseAsync(process.argv)
  .catch((err: unknown) => {
    process.stderr.write(`fetchkeep: ${(err as Error).message}\n`);
    process.exit(1);
  });
