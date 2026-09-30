/**
 * Resource sampling.
 *
 * - Process trees (Linux /proc): every sample walks /proc to find all descendants of the root PIDs, sums RSS
 *   (statm resident pages × page size) and tracks per-PID CPU ticks (utime+stime). CPU seconds = Σ over PIDs of
 *   (last − first observed ticks) / CLK_TCK. Short-lived children that start and exit between samples are missed.
 * - Docker stacks: Docker Engine API over /var/run/docker.sock, `stats?stream=false&one-shot=true` per container:
 *   memory = usage − inactive_file (what `docker stats` reports), CPU = cumulative cpu_usage.total_usage.
 * Other platforms: sampling reports `null` with a note, never a guessed number.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import type { ResourceRecord, ResourceTarget } from "./types.ts";

const PAGE = 4096;
const CLK_TCK = 100;

interface ProcStat {
  ppid: number;
  ticks: number;
}

function readStat(pid: number): ProcStat | null {
  try {
    const s = readFileSync(`/proc/${pid}/stat`, "utf8");
    const rest = s.slice(s.lastIndexOf(")") + 2).split(" ");
    return { ppid: Number(rest[1]), ticks: Number(rest[11]) + Number(rest[12]) };
  } catch {
    return null;
  }
}

function rssBytes(pid: number): number {
  try {
    return Number(readFileSync(`/proc/${pid}/statm`, "utf8").split(" ")[1]) * PAGE;
  } catch {
    return 0;
  }
}

export function processTree(roots: number[]): number[] {
  const children = new Map<number, number[]>();
  for (const entry of readdirSync("/proc")) {
    const pid = Number(entry);
    if (!Number.isInteger(pid)) continue;
    const st = readStat(pid);
    if (!st) continue;
    const list = children.get(st.ppid) ?? [];
    list.push(pid);
    children.set(st.ppid, list);
  }
  const out: number[] = [];
  const stack = [...roots];
  while (stack.length) {
    const p = stack.pop()!;
    if (out.includes(p)) continue;
    out.push(p);
    stack.push(...(children.get(p) ?? []));
  }
  return out;
}

function dockerGet<T>(path: string): Promise<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  const req = httpRequest({ socketPath: "/var/run/docker.sock", path, method: "GET", timeout: 5000 }, (res) => {
    const chunks: Buffer[] = [];
    res.on("data", (c: Buffer) => chunks.push(c));
    res.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as T);
      } catch (e) {
        reject(e);
      }
    });
  });
  req.on("error", reject);
  req.on("timeout", () => req.destroy(new Error("docker API timeout")));
  req.end();
  return promise;
}

export async function composeContainers(project: string): Promise<{ id: string; name: string }[]> {
  const filters = encodeURIComponent(JSON.stringify({ label: [`com.docker.compose.project=${project}`] }));
  const list = await dockerGet<{ Id: string; Names: string[] }[]>(`/containers/json?filters=${filters}`);
  return list.map((c) => ({ id: c.Id, name: (c.Names[0] ?? c.Id).replace(/^\//, "") }));
}

interface DockerStats {
  memory_stats?: { usage?: number; stats?: { inactive_file?: number; total_inactive_file?: number } };
  cpu_stats?: { cpu_usage?: { total_usage?: number } };
}

export async function dockerImageBytes(project: string): Promise<{ image: string; bytes: number }[]> {
  const containers = await dockerGet<{ Image: string; ImageID: string }[]>(
    `/containers/json?filters=${encodeURIComponent(JSON.stringify({ label: [`com.docker.compose.project=${project}`] }))}`,
  );
  const seen = new Set<string>();
  const out: { image: string; bytes: number }[] = [];
  for (const c of containers) {
    if (seen.has(c.ImageID)) continue;
    seen.add(c.ImageID);
    const info = await dockerGet<{ Size: number }>(`/images/${encodeURIComponent(c.ImageID)}/json`);
    out.push({ image: c.Image, bytes: info.Size });
  }
  return out;
}

/** Samples one target (process tree or docker stack) at a fixed interval until stopped. */
export class ResourceMonitor {
  private timer: NodeJS.Timeout | null = null;
  private readonly firstTicks = new Map<string, number>();
  private readonly lastTicks = new Map<string, number>();
  private peak = 0;
  private samples = 0;
  private idle: number | null = null;
  private busy = false;
  readonly supported: boolean;

  readonly profile: string;
  readonly engine: ResourceRecord["engine"];
  readonly target: ResourceTarget;
  readonly intervalMs: number;

  constructor(profile: string, engine: ResourceRecord["engine"], target: ResourceTarget, intervalMs = 250) {
    this.profile = profile;
    this.engine = engine;
    this.target = target;
    this.intervalMs = intervalMs;
    this.supported =
      target.scope === "process-tree" ? process.platform === "linux" && existsSync("/proc/self/stat") : target.scope === "docker-stack" ? existsSync("/var/run/docker.sock") : false;
  }

  private async sample(): Promise<number> {
    let rss = 0;
    if (this.target.scope === "process-tree") {
      for (const pid of processTree(this.target.pids)) {
        const st = readStat(pid);
        if (!st) continue;
        const key = String(pid);
        if (!this.firstTicks.has(key)) this.firstTicks.set(key, st.ticks);
        this.lastTicks.set(key, st.ticks);
        rss += rssBytes(pid);
      }
    } else if (this.target.scope === "docker-stack") {
      await Promise.all(
        this.target.containers.map(async (id) => {
          const s = await dockerGet<DockerStats>(`/containers/${id}/stats?stream=false&one-shot=true`).catch(() => null);
          if (!s) return;
          const inactive = s.memory_stats?.stats?.inactive_file ?? s.memory_stats?.stats?.total_inactive_file ?? 0;
          rss += Math.max(0, (s.memory_stats?.usage ?? 0) - inactive);
          const ns = s.cpu_stats?.cpu_usage?.total_usage;
          if (ns !== undefined) {
            if (!this.firstTicks.has(id)) this.firstTicks.set(id, ns);
            this.lastTicks.set(id, ns);
          }
        }),
      );
    }
    this.samples++;
    this.peak = Math.max(this.peak, rss);
    return rss;
  }

  /** Records the idle footprint, then samples in the background. */
  async start(): Promise<void> {
    if (!this.supported) return;
    this.idle = await this.sample();
    this.timer = setInterval(() => {
      if (this.busy) return;
      this.busy = true;
      void this.sample().finally(() => {
        this.busy = false;
      });
    }, this.intervalMs);
    this.timer.unref();
  }

  async stop(): Promise<ResourceRecord> {
    clearInterval(this.timer ?? undefined);
    this.timer = null;
    if (!this.supported) {
      return {
        profile: this.profile,
        engine: this.engine,
        scope: this.target.scope,
        cpuSeconds: null,
        peakRssMb: null,
        idleRssMb: null,
        samples: 0,
        note: this.target.scope === "remote" ? "hosted service: client-side resources are not comparable and server resources are not exposed" : `sampling not supported on ${process.platform}`,
      };
    }
    await this.sample();
    let cpu = 0;
    for (const [k, first] of this.firstTicks) cpu += (this.lastTicks.get(k) ?? first) - first;
    const cpuSeconds = this.target.scope === "process-tree" ? cpu / CLK_TCK : cpu / 1e9;
    return {
      profile: this.profile,
      engine: this.engine,
      scope: this.target.scope,
      cpuSeconds: Math.round(cpuSeconds * 100) / 100,
      peakRssMb: Math.round((this.peak / 1048576) * 10) / 10,
      idleRssMb: this.idle === null ? null : Math.round((this.idle / 1048576) * 10) / 10,
      samples: this.samples,
    };
  }
}
