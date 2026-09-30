import { FetchkeepError } from "../core/errors.js";
import type { BrowserProvider, RenderRequest, RenderResult } from "./provider.js";

/**
 * Bounds concurrent renders for one provider, keeps the browser warm between requests and closes it after
 * `idleMs` without work. A failed render that may have left the browser in a bad state closes it so the next
 * request starts clean.
 */
export class BrowserPool {
  private active = 0;
  private readonly waiters: { resolve: () => void; reject: (e: unknown) => void; signal: AbortSignal; onAbort: () => void }[] = [];
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(
    readonly provider: BrowserProvider,
    private readonly maxConcurrency: number,
    private readonly idleMs: number,
  ) {}

  get inUse(): number {
    return this.active;
  }

  get queued(): number {
    return this.waiters.length;
  }

  private acquire(signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(signal.reason as Error);
    if (this.active < this.maxConcurrency) {
      this.active++;
      return Promise.resolve();
    }
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const waiter = {
      resolve,
      reject,
      signal,
      onAbort: () => {
        const i = this.waiters.indexOf(waiter);
        if (i >= 0) this.waiters.splice(i, 1);
        reject(signal.reason);
      },
    };
    signal.addEventListener("abort", waiter.onAbort, { once: true });
    this.waiters.push(waiter);
    return promise;
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next.signal.removeEventListener("abort", next.onAbort);
      next.resolve(); // slot passes directly to the next waiter
      return;
    }
    this.active--;
    if (this.active === 0) this.scheduleIdleClose();
  }

  private scheduleIdleClose(): void {
    clearTimeout(this.idleTimer ?? undefined);
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.active === 0) void this.provider.close();
    }, this.idleMs);
    this.idleTimer.unref();
  }

  async render(req: RenderRequest): Promise<RenderResult> {
    await this.acquire(req.signal);
    clearTimeout(this.idleTimer ?? undefined);
    this.idleTimer = null;
    try {
      return await this.provider.render(req);
    } catch (err) {
      // Timeouts and crashes can leave pages or the process wedged: start fresh next time.
      if (!(err instanceof FetchkeepError) || err.code === "browser_failed" || err.code === "timeout") await this.provider.close().catch(() => undefined);
      throw err;
    } finally {
      this.release();
    }
  }

  async close(): Promise<void> {
    clearTimeout(this.idleTimer ?? undefined);
    this.idleTimer = null;
    for (const w of this.waiters.splice(0)) w.reject(new FetchkeepError("cancelled", "Browser pool closed"));
    await this.provider.close();
  }
}
