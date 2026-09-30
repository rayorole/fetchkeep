import { lookup as dnsLookup } from "node:dns";
import type { LookupAddress, LookupAllOptions, LookupOneOptions } from "node:dns";
import ipaddr from "ipaddr.js";
import { FetchkeepError } from "./errors.js";

export interface NetworkPolicyOptions {
  /** Allow every private/internal destination. Intended for trusted local use only. */
  allowPrivateNetwork?: boolean;
  /** Hostnames (exact or `*.suffix`) that may resolve to private addresses. */
  allowHosts?: string[];
  /** CIDR ranges that are allowed even though they are private (e.g. `10.1.0.0/16`). */
  allowCidrs?: string[];
}

export interface AddressVerdict {
  allowed: boolean;
  address: string;
  range: string;
}

const ALLOWED_SCHEMES: Record<string, true> = { "http:": true, "https:": true };

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * Decides which destinations Fetchkeep may contact. Applied to the initial URL, to every redirect hop, to the
 * addresses a hostname actually resolves to (via {@link NetworkPolicy.lookup}, which pins the connection to the
 * checked address) and to browser subrequests.
 */
export class NetworkPolicy {
  readonly allowPrivateNetwork: boolean;
  private readonly hostPatterns: string[];
  private readonly cidrs: [ipaddr.IPv4 | ipaddr.IPv6, number][];

  constructor(opts: NetworkPolicyOptions = {}) {
    this.allowPrivateNetwork = opts.allowPrivateNetwork ?? false;
    this.hostPatterns = (opts.allowHosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean);
    this.cidrs = (opts.allowCidrs ?? []).map((c) => {
      try {
        return ipaddr.parseCIDR(c);
      } catch {
        throw new FetchkeepError("invalid_argument", `Invalid CIDR in allowCidrs: ${c}`);
      }
    });
  }

  isHostAllowlisted(hostname: string): boolean {
    const host = stripBrackets(hostname).toLowerCase();
    return this.hostPatterns.some((p) => (p.startsWith("*.") ? host.endsWith(p.slice(1)) || host === p.slice(2) : host === p));
  }

  /** Classifies one IP address for a given hostname. Only globally routable unicast is allowed by default. */
  checkAddress(address: string, hostname = address): AddressVerdict {
    let ip: ipaddr.IPv4 | ipaddr.IPv6;
    try {
      ip = ipaddr.parse(stripBrackets(address));
    } catch {
      return { allowed: false, address, range: "invalid" };
    }
    if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress()) ip = (ip as ipaddr.IPv6).toIPv4Address();
    const range = ip.range();
    if (range === "unicast") return { allowed: true, address, range };
    if (this.allowPrivateNetwork || this.isHostAllowlisted(hostname)) return { allowed: true, address, range };
    const inAllowedCidr = this.cidrs.some(([net, bits]) => net.kind() === ip.kind() && ip.match(net, bits));
    return { allowed: inAllowedCidr, address, range };
  }

  /** Validates scheme and IP-literal hosts. Hostnames are checked again at connect time by {@link lookup}. */
  checkUrl(input: string | URL): URL {
    let url: URL;
    try {
      url = typeof input === "string" ? new URL(input) : input;
    } catch {
      throw new FetchkeepError("invalid_url", `Not a valid absolute URL: ${String(input)}`);
    }
    if (!ALLOWED_SCHEMES[url.protocol]) {
      throw new FetchkeepError("invalid_url", `Unsupported URL scheme ${url.protocol}; only http and https are allowed`);
    }
    if (url.username || url.password) {
      throw new FetchkeepError("invalid_url", "URLs with embedded credentials are not allowed");
    }
    const host = stripBrackets(url.hostname);
    if (ipaddr.isValid(host)) this.assertAddress(host, host);
    return url;
  }

  assertAddress(address: string, hostname: string): void {
    const verdict = this.checkAddress(address, hostname);
    if (!verdict.allowed) throw blocked(hostname, verdict);
  }

  /** Resolves a hostname and returns only allowed addresses; throws if none are allowed. Used by browser adapters. */
  async resolve(hostname: string): Promise<string[]> {
    const host = stripBrackets(hostname);
    if (ipaddr.isValid(host)) {
      this.assertAddress(host, host);
      return [host];
    }
    const addrs = await new Promise<LookupAddress[]>((resolve, reject) =>
      dnsLookup(host, { all: true, verbatim: true }, (err, res) => (err ? reject(err) : resolve(res))),
    );
    return this.filterResolved(host, addrs).map((a) => a.address);
  }

  private filterResolved(hostname: string, addrs: LookupAddress[]): LookupAddress[] {
    const verdicts = addrs.map((a) => ({ a, v: this.checkAddress(a.address, hostname) }));
    const allowed = verdicts.filter((x) => x.v.allowed).map((x) => x.a);
    // Refuse if *any* resolved address is internal: a mixed answer is a classic rebinding/SSRF trick.
    const firstBlocked = verdicts.find((x) => !x.v.allowed);
    if (firstBlocked) throw blocked(hostname, firstBlocked.v);
    if (allowed.length === 0) {
      throw new FetchkeepError("dns_failure", `No addresses resolved for ${hostname}`);
    }
    return allowed;
  }

  /**
   * A `dns.lookup`-compatible function for `net.connect`/`tls.connect`. Every connection Undici opens resolves
   * through here, so the socket connects only to an address that passed the policy (no rebinding window).
   */
  readonly lookup = (hostname: string, options: LookupOneOptions | LookupAllOptions | number, callback: LookupCallback): void => {
    const opts = typeof options === "number" ? { family: options } : options;
    dnsLookup(hostname, { family: opts.family ?? 0, hints: opts.hints ?? 0, all: true, verbatim: true }, (err, addrs) => {
      if (err) return callback(err, "");
      let allowed: LookupAddress[];
      try {
        allowed = this.filterResolved(hostname, addrs);
      } catch (e) {
        return callback(e as NodeJS.ErrnoException, "");
      }
      if ((opts as LookupAllOptions).all) return callback(null, allowed);
      const first = allowed[0]!;
      callback(null, first.address, first.family);
    });
  };
}

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function blocked(hostname: string, v: AddressVerdict): FetchkeepError {
  return new FetchkeepError("blocked_by_policy", `Refusing to contact ${hostname}: address ${v.address} is in the ${v.range} range`, {
    hint: "Private, loopback, link-local and other internal addresses are blocked by default. For trusted local use set allowPrivateNetwork, or add the host to allowHosts / the range to allowCidrs.",
    details: { hostname, address: v.address, range: v.range },
  });
}
