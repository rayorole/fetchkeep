import { describe, expect, it } from "vitest";
import { FetchkeepError } from "../src/core/errors.js";
import { NetworkPolicy } from "../src/core/netpolicy.js";

describe("NetworkPolicy.checkAddress", () => {
  const policy = new NetworkPolicy();
  it.each([
    ["127.0.0.1", "loopback"],
    ["10.1.2.3", "private"],
    ["172.16.0.1", "private"],
    ["192.168.1.1", "private"],
    ["169.254.169.254", "linkLocal"],
    ["100.64.0.1", "carrierGradeNat"],
    ["0.0.0.0", "unspecified"],
    ["224.0.0.1", "multicast"],
    ["::1", "loopback"],
    ["fd00::1", "uniqueLocal"],
    ["fe80::1", "linkLocal"],
    ["::ffff:127.0.0.1", "loopback"],
    ["::ffff:10.0.0.1", "private"],
  ])("blocks %s (%s)", (addr, range) => {
    const v = policy.checkAddress(addr);
    expect(v.allowed).toBe(false);
    expect(v.range).toBe(range);
  });

  it.each(["93.184.215.14", "1.1.1.1", "2606:4700:4700::1111"])("allows public %s", (addr) => {
    expect(policy.checkAddress(addr).allowed).toBe(true);
  });

  it("honours allowPrivateNetwork, allowHosts wildcards and allowCidrs", () => {
    expect(new NetworkPolicy({ allowPrivateNetwork: true }).checkAddress("10.0.0.1").allowed).toBe(true);
    const hosts = new NetworkPolicy({ allowHosts: ["*.internal.test", "db.local"] });
    expect(hosts.checkAddress("10.0.0.1", "api.internal.test").allowed).toBe(true);
    expect(hosts.checkAddress("10.0.0.1", "internal.test").allowed).toBe(true);
    expect(hosts.checkAddress("10.0.0.1", "db.local").allowed).toBe(true);
    expect(hosts.checkAddress("10.0.0.1", "evil-internal.test").allowed).toBe(false);
    const cidrs = new NetworkPolicy({ allowCidrs: ["10.1.0.0/16"] });
    expect(cidrs.checkAddress("10.1.200.3").allowed).toBe(true);
    expect(cidrs.checkAddress("10.2.0.1").allowed).toBe(false);
  });
});

describe("NetworkPolicy.checkUrl", () => {
  const policy = new NetworkPolicy();
  it("rejects non-http schemes, credentials and private IP literals", () => {
    for (const [url, code] of [
      ["file:///etc/passwd", "invalid_url"],
      ["ftp://example.com/", "invalid_url"],
      ["http://user:pw@example.com/", "invalid_url"],
      ["http://127.0.0.1:8080/", "blocked_by_policy"],
      ["http://[::1]/", "blocked_by_policy"],
      ["http://169.254.169.254/latest/meta-data/", "blocked_by_policy"],
      ["not a url", "invalid_url"],
    ] as const) {
      expect(() => policy.checkUrl(url), url).toThrow(expect.objectContaining({ code }) as unknown as Error);
    }
  });

  it("accepts public hostnames (resolution is checked at connect time)", () => {
    expect(policy.checkUrl("https://example.com/a?b=1").hostname).toBe("example.com");
  });
});

describe("NetworkPolicy.lookup", () => {
  it("refuses hostnames that resolve to loopback", async () => {
    const policy = new NetworkPolicy();
    const { promise, resolve } = Promise.withResolvers<unknown>();
    policy.lookup("localhost", { all: true }, (e) => resolve(e));
    const err = await promise;
    expect(err).toBeInstanceOf(FetchkeepError);
    expect((err as FetchkeepError).code).toBe("blocked_by_policy");
  });

  it("returns only checked addresses when the host is allow-listed", async () => {
    const policy = new NetworkPolicy({ allowHosts: ["localhost"] });
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    policy.lookup("localhost", { family: 4 }, (e, a) => (e ? reject(e) : resolve(a as string)));
    const addr = await promise;
    expect(addr).toBe("127.0.0.1");
  });
});
