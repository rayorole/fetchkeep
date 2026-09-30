/** CLI spawn-to-exit microbenchmark; intentionally separate from persistent MCP retrieval latency. */
import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs, promisify } from "node:util";

const { values } = parseArgs({ options: {
  entry: { type: "string", default: "dist/src/cli/main.js" },
  out: { type: "string", default: "bench/runs/startup.json" },
  repetitions: { type: "string", default: "15" },
}, allowPositionals: false });
const repetitions = Number(values.repetitions);
if (!Number.isSafeInteger(repetitions) || repetitions < 1) throw new Error("--repetitions must be a positive integer");
const entry = resolve(values.entry!);
const home = await mkdtemp(join(tmpdir(), "fetchkeep-startup-"));
const run = promisify(execFile);
const server = createServer((_req, res) => res.writeHead(200, { "content-type": "text/html" }).end(
  '<html><head><title>Startup evidence</title></head><body><main><h1>Startup evidence</h1><p>The amber observatory records wind direction every twelve minutes.</p><pre><code>const interval = 12;</code></pre></main></body></html>',
));
const samples: Record<string, number[]> = { help: [], doctor: [], read: [], fetch: [] };
async function call(args: string[]): Promise<{ ms: number; stdout: string }> {
  const start = performance.now();
  const { stdout } = await run(process.execPath, [entry, "--home", home, ...args], {
    timeout: 30_000,
    env: { ...process.env, FETCHKEEP_CONFIG: "", FETCHKEEP_WORKSPACE: "default" },
  });
  return { ms: performance.now() - start, stdout };
}
try {
  const listening = once(server, "listening");
  server.listen(0, "127.0.0.1");
  await listening;
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/evidence`;
  const fetchArgs = ["--allow-private-network", "--json", "fetch", url, "--mode", "http"];
  const saved = JSON.parse((await call(fetchArgs)).stdout) as { document: { ref: string } };
  const commands: Record<string, string[]> = {
    help: ["--help"], doctor: ["--json", "doctor"], read: ["--json", "read", saved.document.ref], fetch: fetchArgs,
  };
  for (let i = 0; i < repetitions; i++) {
    for (const [kind, args] of Object.entries(commands)) {
      const result = await call(args);
      if (kind === "read" || kind === "fetch") {
        const env = JSON.parse(result.stdout) as { content: { text: string }; document: { saved: boolean } };
        if (!env.content.text.includes("amber observatory")) throw new Error(`${kind}: missing saved evidence`);
        if (kind === "fetch" && !env.document.saved) throw new Error("fetch: persistence was disabled");
      }
      samples[kind]!.push(result.ms);
    }
  }
  const summary = Object.fromEntries(Object.entries(samples).map(([kind, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return [kind, { n: sorted.length, medianMs: sorted[Math.ceil(sorted.length * 0.5) - 1], p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1] }];
  }));
  const result = { node: process.version, platform: process.platform, entry, at: new Date().toISOString(),
    command: `node bench/startup.ts ${process.argv.slice(2).join(" ")}`,
    method: "Fresh CLI spawn to exit; commands interleaved each repetition; local HTTP; persistence enabled; populated saved-read workspace. Includes OS/module disk caches; excludes first seed fetch. Not persistent MCP latency.",
    summary, samples };
  const out = resolve(values.out!);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
} finally {
  server.closeAllConnections();
  server.close();
  await rm(home, { recursive: true, force: true });
}
