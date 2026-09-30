#!/usr/bin/env node
import { createWriteStream, readFileSync } from "node:fs";
import { once } from "node:events";
import { Command, InvalidArgumentError, Option } from "commander";
import { loadConfig, type ConfigOverrides } from "../core/config.js";
import { FetchkeepError } from "../core/errors.js";
import { FETCH_MODES } from "../core/schema.js";
import type { Envelope, FetchMode } from "../core/schema.js";
import { Fetchkeep } from "../core/service.js";
import { CrawlRepo } from "../core/store/crawls.js";
import { VERSION } from "../version.js";
import { runDoctor } from "./doctor.js";
import { runMcpStdio } from "./mcp.js";
import { configurePresentation, printEnvelope, terminalText } from "./presentation.js";

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
  printEnvelope(env, opts.json);
  process.exitCode = exitCodeFor(env);
}

export function buildProgram(): Command {
  const program = new Command()
    .name("fetchkeep")
    .description("Fetch web pages as Markdown. Save, search and cite them locally.")
    .version(VERSION)
    .optionsGroup("Storage:")
    .option("--home <dir>", "data directory (default: $FETCHKEEP_HOME or ~/.fetchkeep)")
    .option("-w, --workspace <name>", "workspace (isolated store), default: $FETCHKEEP_WORKSPACE or 'default'")
    .option("--config <file>", "config file (default: <home>/config.json if present)")
    .optionsGroup("Network access:")
    .option("--allow-private-network", "allow private/loopback destinations (trusted local use only)")
    .option("--allow-host <host>", "allow a host that resolves to a private address (repeatable, supports *.suffix)", collect)
    .optionsGroup("Output:")
    .option("--json", "print the JSON envelope on stdout")
    .showHelpAfterError()
    // Set before subcommands are added so they inherit it: usage errors exit with 2.
    .exitOverride((err) => {
      process.exit(err.exitCode === 0 ? 0 : 2);
    })
    .addHelpText(
      "after",
      "\nExamples:\n  fetchkeep fetch https://example.com > page.md\n  fetchkeep search \"retry policy\"\n  fetchkeep read https://example.com\n  fetchkeep crawl https://example.com/docs --max-pages 10\n  fetchkeep doctor\n\nHuman summaries go to stderr; document Markdown goes to stdout.\nUse --json for the complete machine-readable envelope.\nExit codes: 0 success, 1 error, 2 usage error, 3 partial result.\nDocs: https://github.com/rayorole/fetchkeep#readme",
    );
  configurePresentation(program);
  const g = () => program.opts<GlobalOpts>();

  program
    .command("fetch")
    .helpGroup("Retrieve and explore:")
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
    .helpGroup("Retrieve and explore:")
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
    .helpGroup("Retrieve and explore:")
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
    .command("crawl")
    .helpGroup("Retrieve and explore:")
    .description("bounded crawl (same origin by default) that saves every page")
    .argument("[url]", "start URL (omit with --resume)")
    .option("-p, --max-pages <n>", "maximum pages to fetch", int("max-pages"))
    .option("-d, --max-depth <n>", "maximum link depth from the start URL", int("max-depth"))
    .option("--include <pattern>", "only paths matching glob (/docs/**) or /regex/ (repeatable)", collect)
    .option("--exclude <pattern>", "skip paths matching glob or /regex/ (repeatable)", collect)
    .option("--any-origin", "follow links to other origins")
    .option("--no-robots", "ignore robots.txt (only for sites you operate)")
    .option("--delay <ms>", "minimum delay between requests to one origin", int("delay"))
    .option("--concurrency <n>", "parallel fetches (1-8)", int("concurrency"))
    .addOption(new Option("--sitemap <mode>", "use sitemaps").choices(["include", "skip", "only"]))
    .addOption(new Option("-m, --mode <mode>", "backend per page").choices([...FETCH_MODES]))
    .option("-t, --timeout <ms>", "overall deadline for this run", int("timeout"))
    .option("--page-timeout <ms>", "deadline per page", int("page-timeout"))
    .option("--resume <crawlId>", "continue a stopped crawl")
    .action(
      (
        url: string | undefined,
        o: {
          maxPages?: number; maxDepth?: number; include?: string[]; exclude?: string[]; anyOrigin?: boolean; robots: boolean; delay?: number;
          concurrency?: number; sitemap?: "include" | "skip" | "only"; mode?: FetchMode; timeout?: number; pageTimeout?: number; resume?: string;
        },
      ) =>
        run(g(), (fk, signal) => {
          if (!url && !o.resume) throw new FetchkeepError("invalid_argument", "Give a start URL or --resume <crawlId>");
          return fk.crawl({
            signal,
            ...(url ? { url } : {}),
            ...(o.resume ? { resume: o.resume } : {}),
            ...(o.maxPages !== undefined ? { maxPages: o.maxPages } : {}),
            ...(o.maxDepth !== undefined ? { maxDepth: o.maxDepth } : {}),
            ...(o.include ? { include: o.include } : {}),
            ...(o.exclude ? { exclude: o.exclude } : {}),
            ...(o.anyOrigin ? { sameOrigin: false } : {}),
            ...(o.robots === false ? { respectRobots: false } : {}),
            ...(o.delay !== undefined ? { delayMs: o.delay } : {}),
            ...(o.concurrency !== undefined ? { concurrency: o.concurrency } : {}),
            ...(o.sitemap ? { sitemap: o.sitemap } : {}),
            ...(o.mode ? { mode: o.mode } : {}),
            ...(o.timeout !== undefined ? { timeoutMs: o.timeout } : {}),
            ...(o.pageTimeout !== undefined ? { pageTimeoutMs: o.pageTimeout } : {}),
          });
        }),
    );

  program
    .command("extract")
    .helpGroup("Retrieve and explore:")
    .description("[experimental] extract JSON matching a schema from a saved document with a local Ollama model, with evidence checks")
    .argument("<target>", "URL (fetched and saved first if needed), document id or fk: ref")
    .requiredOption("-s, --schema <schema>", "JSON Schema (top-level type object): a file path or inline JSON")
    .option("-i, --instructions <text>", "extra guidance for the model")
    .option("--model <name>", "Ollama model (default: $FETCHKEEP_OLLAMA_MODEL or ollama.model)")
    .option("--max-chars <n>", "document characters sent to the model (default 24000)", int("max-chars"))
    .action((target: string, o: { schema: string; instructions?: string; model?: string; maxChars?: number }) =>
      run(g(), (fk, signal) =>
        fk.extract({
          target,
          signal,
          schema: parseSchemaOption(o.schema),
          ...(o.instructions ? { instructions: o.instructions } : {}),
          ...(o.model ? { model: o.model } : {}),
          ...(o.maxChars !== undefined ? { maxChars: o.maxChars } : {}),
        }),
      ),
    );

  program
    .command("crawls")
    .helpGroup("Saved library:")
    .description("list recent crawls")
    .option("-n, --limit <n>", "maximum crawls", int("limit"), 20)
    .action((o: { limit: number }) =>
      run(g(), (fk) => ({ status: "success", tool: "crawls", data: { crawls: new CrawlRepo(fk.store.db).list(o.limit) }, timings: {}, warnings: [] })),
    );

  program
    .command("list")
    .helpGroup("Saved library:")
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
    .helpGroup("Saved library:")
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
    .helpGroup("Saved library:")
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
    .helpGroup("Saved library:")
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
    .helpGroup("Saved library:")
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
    .helpGroup("Setup and integrations:")
    .action(() => run(g(), (fk) => runDoctor(fk)));

  program
    .command("mcp")
    .description("run the MCP server on stdio (stdout carries protocol messages only)")
    .helpGroup("Setup and integrations:")
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

/** Inline JSON (starts with `{`) or a path to a JSON file. */
function parseSchemaOption(value: string): Record<string, unknown> {
  const inline = value.trim().startsWith("{");
  let text = value;
  if (!inline) {
    try {
      text = readFileSync(value, "utf8");
    } catch (err) {
      throw new FetchkeepError("invalid_argument", `Cannot read schema file ${value}: ${(err as Error).message}`);
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new FetchkeepError("invalid_argument", `Schema ${inline ? "argument" : `file ${value}`} is not valid JSON: ${(err as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new FetchkeepError("invalid_argument", "Schema must be a JSON object");
  return parsed as Record<string, unknown>;
}

buildProgram()
  .parseAsync(process.argv)
  .catch((err: unknown) => {
    process.stderr.write(`fetchkeep: ${terminalText((err as Error).message)}\n`);
    process.exit(1);
  });
