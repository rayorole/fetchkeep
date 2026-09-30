import type { NetworkPolicy } from "../core/netpolicy.js";

export type BrowserName = "chromium" | "lightpanda";

export interface RenderRequest {
  url: string;
  /** Shared end-to-end deadline; providers must stop and clean up when it aborts. */
  signal: AbortSignal;
  /** Absolute deadline (epoch ms) matching `signal`, for sizing per-operation timeouts. */
  deadline: number;
  policy: NetworkPolicy;
  userAgent: string;
  /** Extra time to wait after `load` for late network activity. */
  settleMs: number;
  /** Maximum size of the serialized HTML. */
  maxBytes: number;
}

export interface RequestStats {
  total: number;
  blocked: number;
  failed: number;
}

export interface RenderResult {
  finalUrl: string;
  status: number;
  contentType: string;
  /** Serialized DOM after scripts ran (`document.documentElement.outerHTML`). */
  html: string;
  truncated: boolean;
  requests: RequestStats;
  timings: { launchMs: number; navigateMs: number; totalMs: number };
}

export interface BrowserAvailability {
  available: boolean;
  /** Human-readable explanation, including how to install when unavailable. */
  detail: string;
}

/**
 * A browser backend. Implementations must not leak automation-library types; they receive a URL and return
 * serialized HTML. Each `render` runs in a fresh, isolated browser context and applies the network policy to every
 * subrequest.
 */
export interface BrowserProvider {
  readonly name: BrowserName;
  availability(): Promise<BrowserAvailability>;
  render(req: RenderRequest): Promise<RenderResult>;
  /** True while a browser process/connection is held. */
  readonly running: boolean;
  /** Releases the browser process/connection. Safe to call repeatedly. */
  close(): Promise<void>;
}
