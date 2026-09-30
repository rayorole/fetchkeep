/** Separate real-MCP session and saved-library scenarios. Node 24+, built Fetchkeep dist required. */
import { parseArgs } from "node:util";
import { runWorkloads } from "./lib/workloads.ts";

const { values } = parseArgs({ options: {
  profiles: { type: "string", default: "fetchkeep-http,donsetch" },
  repetitions: { type: "string", default: "5" },
  operations: { type: "string", default: "4" },
  timeout: { type: "string", default: "30000" },
  bind: { type: "string", default: "127.0.0.1" },
  advertise: { type: "string", default: "127.0.0.1" },
  out: { type: "string" },
}, allowPositionals: false });
const out = values.out ?? `bench/runs/${new Date().toISOString().replace(/[:.]/g, "-")}-workloads`;
const dir = await runWorkloads({
  profiles: [...new Set(values.profiles!.split(",").map((s) => s.trim()).filter(Boolean))],
  repetitions: Number(values.repetitions), operations: Number(values.operations), timeoutMs: Number(values.timeout),
  bind: values.bind!, advertise: values.advertise!, out,
  command: `node bench/workloads.ts ${process.argv.slice(2).join(" ")}`,
});
process.stdout.write(`${dir}\n`);
