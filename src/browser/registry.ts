import type { FetchkeepConfig } from "../core/config.js";
import type { NetworkPolicy } from "../core/netpolicy.js";
import { ChromiumProvider } from "./chromium.js";
import { BrowserPool } from "./pool.js";
import type { BrowserAvailability, BrowserName, BrowserProvider } from "./provider.js";

/** The browser backends enabled in configuration, each behind a bounded, idle-closing pool. */
export class Browsers {
  private readonly pools = new Map<BrowserName, BrowserPool>();
  private readonly availabilityCache = new Map<BrowserName, Promise<BrowserAvailability>>();
  readonly preferred: BrowserName;

  constructor(config: FetchkeepConfig["browser"], policy: NetworkPolicy, providers?: BrowserProvider[]) {
    this.preferred = config.preferred;
    const list =
      providers ??
      [
        config.chromium.enabled
          ? new ChromiumProvider({ channel: config.chromium.channel, executablePath: config.chromium.executablePath, sandbox: config.chromium.sandbox })
          : null,
      ].filter((p): p is ChromiumProvider => p !== null);
    for (const p of list) this.pools.set(p.name, new BrowserPool(p, config.maxConcurrency, config.idleMs));
  }

  /** Enabled backends, preferred first. */
  enabled(): BrowserName[] {
    return [...this.pools.keys()].sort((a, b) => (a === this.preferred ? -1 : b === this.preferred ? 1 : 0));
  }

  pool(name: BrowserName): BrowserPool | undefined {
    return this.pools.get(name);
  }

  availability(name: BrowserName): Promise<BrowserAvailability> {
    const pool = this.pools.get(name);
    if (!pool) return Promise.resolve({ available: false, detail: `${name} backend is not enabled in the configuration` });
    let cached = this.availabilityCache.get(name);
    if (!cached) {
      cached = pool.provider.availability();
      this.availabilityCache.set(name, cached);
    }
    return cached;
  }

  async close(): Promise<void> {
    await Promise.all([...this.pools.values()].map((p) => p.close()));
  }
}
