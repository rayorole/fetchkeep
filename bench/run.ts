/**
 * Benchmark entry point.
 *
 *   npm run bench -- --engines fetchkeep,firecrawl,donsetch --suite smoke|fetch|crawl [options]
 *
 * Options:
 *   --engines <list>        engines or individual profiles (fetchkeep-http, firecrawl-selfhost, …)
 *   --suite <name>          bench/suites/<name>.json
 *   --repetitions <n>       override the suite's repetitions
 *   --seed <n>              interleaving seed (default 42)
 *   --timeout <ms>          per-request deadline for every engine (default 30000)
 *   --advertise <host>      address put in fixture URLs (default: first non-loopback IPv4)
 *   --bind <host>           fixture server bind address (default 0.0.0.0)
 *   --cold-start            also measure cold starts (Fetchkeep/DonSeTch CLI one-shot; Firecrawl self-host stack restart)
 *   --footprint             also measure installed footprint (npm pack/install, browser binaries, docker images)
 *   --allow-paid            permit paid hosted services (Firecrawl hosted); requires --budget-credits
 *   --budget-credits <n>    maximum credits the run may spend on hosted services
 *   --out <dir>             run directory (default bench/runs/<timestamp>-<suite>)
 *   --no-report             skip report generation
 *
 * Environment: FETCHKEEP_BENCH_LIGHTPANDA (Lightpanda executable), FETCHKEEP_BENCH_DONSETCH (donsetch binary),
 * FETCHKEEP_BENCH_CHROMIUM (Chromium for DonSeTch), FIRECRAWL_SELFHOST_URL, FIRECRAWL_CHECKOUT, FIRECRAWL_API_KEY.
 */
import { parseArgs } from "node:util";
import { run } from "./lib/runner.ts";

const { values } = parseArgs({
  options: {
    engines: { type: "string", default: "fetchkeep,firecrawl,donsetch" },
    suite: { type: "string", default: "smoke" },
    repetitions: { type: "string" },
    seed: { type: "string", default: "42" },
    timeout: { type: "string", default: "30000" },
    advertise: { type: "string" },
    bind: { type: "string", default: "0.0.0.0" },
    "cold-start": { type: "boolean", default: false },
    footprint: { type: "boolean", default: false },
    "allow-paid": { type: "boolean", default: false },
    "budget-credits": { type: "string", default: "0" },
    out: { type: "string" },
    "no-report": { type: "boolean", default: false },
  },
  allowPositionals: false,
});

const runDir = await run({
  engines: values.engines!.split(",").map((s) => s.trim()).filter(Boolean),
  suite: values.suite!,
  ...(values.repetitions ? { repetitions: Number(values.repetitions) } : {}),
  seed: Number(values.seed),
  timeoutMs: Number(values.timeout),
  ...(values.out ? { out: values.out } : {}),
  ...(values.advertise ? { advertise: values.advertise } : {}),
  bind: values.bind!,
  coldStart: values["cold-start"]!,
  footprint: values.footprint!,
  allowPaid: values["allow-paid"]!,
  budgetCredits: Number(values["budget-credits"]),
  command: `node bench/run.ts ${process.argv.slice(2).join(" ")}`,
});

if (!values["no-report"]) {
  const { generateReport } = await import("./lib/report.ts");
  const { files } = await generateReport(runDir);
  process.stderr.write(`[bench] report: ${files.join(", ")}\n`);
}
process.stdout.write(`${runDir}\n`);
