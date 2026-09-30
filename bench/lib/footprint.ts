/**
 * Installed-footprint measurement. Method: bytes on disk as reported by `du -sb` (apparent size) of what a user
 * must install for each profile, measured on the benchmark machine. Docker images: `Size` from the Engine API.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { dockerImageBytes } from "./procmon.ts";
import type { FootprintRecord } from "./types.ts";

function du(path: string): number | null {
  if (!existsSync(path)) return null;
  try {
    return Number(execFileSync("du", ["-sb", path], { encoding: "utf8" }).split(/\s/)[0]);
  } catch {
    return null;
  }
}

function playwrightDir(prefix: string): string | null {
  const root = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(root)) return null;
  const dir = readdirSync(root).filter((d) => d.startsWith(prefix)).sort().at(-1);
  return dir ? join(root, dir) : null;
}

export async function measureFootprint(repo: string, env: NodeJS.ProcessEnv): Promise<FootprintRecord[]> {
  const out: FootprintRecord[] = [];
  const push = (profile: string, engine: FootprintRecord["engine"], component: string, bytes: number | null, method: string) => {
    if (bytes !== null) out.push({ profile, engine, component, bytes, method });
  };

  // Fetchkeep: pack the working tree and install the tarball into an empty project (production dependencies only).
  const tmp = mkdtempSync(join(tmpdir(), "fk-footprint-"));
  try {
    const tgz = execFileSync("npm", ["pack", "--silent", "--pack-destination", tmp], { cwd: repo, encoding: "utf8" }).trim().split("\n").at(-1)!;
    push("fetchkeep-http", "fetchkeep", "npm tarball", du(join(tmp, tgz)), "npm pack");
    execFileSync("npm", ["init", "-y"], { cwd: tmp, stdio: "ignore" });
    execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", join(tmp, tgz)], { cwd: tmp, stdio: "ignore" });
    push("fetchkeep-http", "fetchkeep", "node_modules (fetchkeep + runtime deps, no browser)", du(join(tmp, "node_modules")), "npm install <tarball> --omit=dev; du -sb node_modules");
    execFileSync("npm", ["install", "--no-audit", "--no-fund", "playwright-core@1.63.0", "puppeteer-core@25.12.0"], { cwd: tmp, stdio: "ignore" });
    push("fetchkeep-chromium", "fetchkeep", "playwright-core package", du(join(tmp, "node_modules", "playwright-core")), "du -sb node_modules/playwright-core");
    push("fetchkeep-lightpanda", "fetchkeep", "puppeteer-core (+deps not shared)", du(join(tmp, "node_modules", "puppeteer-core")), "du -sb node_modules/puppeteer-core (dependencies excluded)");
  } catch (err) {
    process.stderr.write(`[bench] footprint (fetchkeep) failed: ${(err as Error).message}\n`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  push("fetchkeep-chromium", "fetchkeep", "Chromium headless shell", du(playwrightDir("chromium_headless_shell-") ?? ""), "du -sb ~/.cache/ms-playwright/chromium_headless_shell-*");
  if (env.FETCHKEEP_BENCH_LIGHTPANDA) push("fetchkeep-lightpanda", "fetchkeep", "Lightpanda binary", du(env.FETCHKEEP_BENCH_LIGHTPANDA), "du -sb <lightpanda>");

  // DonSeTch: the npm package directory (includes the platform binary and ONNX runtime) + the Chromium it escalates to.
  const ds = env.FETCHKEEP_BENCH_DONSETCH;
  if (ds) push("donsetch", "donsetch", "npm package (binary + libonnxruntime)", du(join(ds, "..", "..")), "du -sb node_modules/donsetch");
  push("donsetch", "donsetch", "Chromium (full, for tier-2 escalation)", du(playwrightDir("chromium-") ?? ""), "du -sb ~/.cache/ms-playwright/chromium-* (Playwright full Chromium)");

  // Firecrawl self-hosted: images used by the running compose project.
  try {
    for (const img of await dockerImageBytes(env.FIRECRAWL_COMPOSE_PROJECT ?? "firecrawl")) {
      push("firecrawl-selfhost", "firecrawl", `docker image ${img.image}`, img.bytes, "Docker Engine API /images/{id}/json Size");
    }
  } catch (err) {
    process.stderr.write(`[bench] footprint (firecrawl) unavailable: ${(err as Error).message}\n`);
  }
  return out;
}
