import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/core/config.js";
import { Envelope } from "../../src/core/schema.js";
import { Fetchkeep } from "../../src/core/service.js";
import { jsFixtures } from "../support/js-fixtures.js";
import { startServer, type TestServer } from "../support/server.js";
import { tempHome } from "../support/service.js";

// Opt-in: `npm run test:browser`. Needs playwright-core and `npx playwright-core install --only-shell chromium`.
let srv: TestServer;
const { home, cleanup } = tempHome();
let fk: Fetchkeep;

beforeAll(async () => {
  srv = await startServer(jsFixtures());
  fk = new Fetchkeep(
    loadConfig({ env: {}, overrides: { home, network: { allowHosts: ["localhost"] }, browser: { chromium: { enabled: true }, settleMs: 300 } } }),
  );
});
afterAll(async () => {
  await fk.close();
  await srv.close();
  cleanup();
});
const u = (p: string) => `http://localhost:${srv.port}${p}`;

describe("Chromium backend", () => {
  it("is reported available by doctor-style checks", async () => {
    expect(await fk.browsers.availability("chromium")).toMatchObject({ available: true });
  });

  it("renders JavaScript + XHR content and auto mode escalates to it", async () => {
    const env = Envelope.parse(await fk.fetch({ url: u("/js/app"), includeBlocks: true }));
    expect(env.status, JSON.stringify(env.backend)).toBe("success");
    expect(env.backend).toMatchObject({ used: "chromium", escalated: true });
    expect(env.content!.text).toContain("# Rendered heading");
    expect(env.content!.text).toContain("inserted by client-side JavaScript");
    expect(env.content!.text).toContain("| alpha | 1 |");
  });

  it("blocks subrequests to addresses outside the network policy", async () => {
    srv.hits.clear();
    const env = await fk.fetch({ url: u("/js/app"), mode: "chromium" });
    expect(env.status).toBe("success");
    expect(env.warnings.join(" ")).toMatch(/subrequest\(s\) blocked/);
    expect(srv.hits.get("/js/data.json")).toBe(1);
    expect(srv.hits.get("/secret") ?? 0).toBe(0);
  });

  it("isolates cookies and storage between renders", async () => {
    const a = await fk.fetch({ url: u("/js/state"), mode: "chromium", save: false });
    const b = await fk.fetch({ url: u("/js/state"), mode: "chromium", save: false });
    expect(a.content!.text).toContain("cookie=none storage=none");
    expect(b.content!.text).toContain("cookie=none storage=none");
  });

  it("enforces the deadline when a page never finishes loading", async () => {
    const t0 = Date.now();
    const env = await fk.fetch({ url: u("/js/slow"), mode: "chromium", timeoutMs: 2500 });
    expect(Date.now() - t0).toBeLessThan(6000);
    expect(env.status).toBe("error");
    expect(env.error?.code).toBe("timeout");
    // The pool recovers: the next render works.
    expect((await fk.fetch({ url: u("/js/state"), mode: "chromium", save: false })).status).toBe("success");
  });

  it("refuses navigation to blocked addresses", async () => {
    const env = await fk.fetch({ url: `http://127.0.0.1:${srv.port}/secret`, mode: "chromium" });
    expect(env.error?.code).toBe("blocked_by_policy");
  });
});
