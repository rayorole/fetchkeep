import type { BrowserAvailability, BrowserName, BrowserProvider, RenderRequest, RenderResult } from "../../src/browser/provider.js";

export type FakeBehavior = { html: string; status?: number } | { error: Error } | "hang";

/** Scripted BrowserProvider for unit tests: no real browser. */
export class FakeBrowser implements BrowserProvider {
  renders: string[] = [];
  closes = 0;
  concurrent = 0;
  maxConcurrent = 0;
  running = false;

  constructor(
    readonly name: BrowserName,
    private readonly behavior: FakeBehavior | ((url: string) => FakeBehavior),
    private readonly avail: BrowserAvailability = { available: true, detail: "fake" },
  ) {}

  async availability(): Promise<BrowserAvailability> {
    return this.avail;
  }

  async render(req: RenderRequest): Promise<RenderResult> {
    this.renders.push(req.url);
    this.running = true;
    this.concurrent++;
    this.maxConcurrent = Math.max(this.maxConcurrent, this.concurrent);
    try {
      const b = typeof this.behavior === "function" ? this.behavior(req.url) : this.behavior;
      if (b === "hang") {
        const { promise, reject } = Promise.withResolvers<never>();
        req.signal.addEventListener("abort", () => reject(req.signal.reason), { once: true });
        return await promise;
      }
      if ("error" in b) throw b.error;
      await Promise.resolve();
      return {
        finalUrl: req.url,
        status: b.status ?? 200,
        contentType: "text/html",
        html: b.html,
        truncated: false,
        requests: { total: 1, blocked: 0, failed: 0 },
        timings: { launchMs: 0, navigateMs: 1, totalMs: 1 },
      };
    } finally {
      this.concurrent--;
    }
  }

  async close(): Promise<void> {
    this.closes++;
    this.running = false;
  }
}
