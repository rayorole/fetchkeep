import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/core/config.js";
import { Envelope } from "../../src/core/schema.js";
import { Fetchkeep } from "../../src/core/service.js";
import { jsFixtures } from "../support/js-fixtures.js";
import { startServer, type TestServer } from "../support/server.js";
import { tempHome } from "../support/service.js";

// Opt-in: `FETCHKEEP_TEST_LIGHTPANDA=/path/to/lightpanda npm run test:browser` (Linux/macOS, or inside WSL2).
const executable = process.env.FETCHKEEP_TEST_LIGHTPANDA;
const suite = executable ? describe : describe.skip;

let srv: TestServer;
const { home, cleanup } = tempHome();
let fk: Fetchkeep;

suite("Lightpanda backend (experimental)", () => {
  beforeAll(async () => {
    srv = await startServer(jsFixtures());
    fk = new Fetchkeep(
      loadConfig({
        env: {},
        overrides: {
          home,
          network: { allowHosts: ["localhost"] },
          browser: { preferred: "lightpanda", lightpanda: { enabled: true, executablePath: executable! }, settleMs: 300 },
        },
      }),
    );
  });
  afterAll(async () => {
    await fk.close();
    await srv.close();
    cleanup();
  });
  const u = (p: string) => `http://localhost:${srv.port}${p}`;

  it("renders JavaScript + XHR content via auto escalation", async () => {
    const env = Envelope.parse(await fk.fetch({ url: u("/js/app") }));
    expect(env.backend, JSON.stringify(env.backend)).toMatchObject({ used: "lightpanda", escalated: true });
    expect(env.content!.text).toContain("# Rendered heading");
    expect(env.content!.text).toContain("inserted by client-side JavaScript");
    expect(env.content!.text).toContain("| alpha | 1 |");
  });

  it("blocks subrequests to addresses outside the network policy", async () => {
    srv.hits.clear();
    const env = await fk.fetch({ url: u("/js/app"), mode: "lightpanda" });
    expect(env.status).toBe("success");
    expect(srv.hits.get("/js/data.json")).toBe(1);
    expect(srv.hits.get("/secret") ?? 0).toBe(0);
  });

  it("isolates cookies and storage between renders", async () => {
    await fk.fetch({ url: u("/js/state"), mode: "lightpanda", save: false });
    const b = await fk.fetch({ url: u("/js/state"), mode: "lightpanda", save: false });
    expect(b.content!.text).toContain("cookie=none storage=none");
  });

  it("enforces the deadline when a page never finishes loading", async () => {
    const t0 = Date.now();
    const env = await fk.fetch({ url: u("/js/slow"), mode: "lightpanda", timeoutMs: 2500 });
    expect(Date.now() - t0).toBeLessThan(8000);
    // Either the deadline fires, or Lightpanda does not wait for images before `load`; both must end in time.
    expect(["timeout", undefined]).toContain(env.error?.code);
    expect((await fk.fetch({ url: u("/js/state"), mode: "lightpanda", save: false })).status).toBe("success");
  });

  it("refuses navigation to blocked addresses", async () => {
    const env = await fk.fetch({ url: `http://127.0.0.1:${srv.port}/secret`, mode: "lightpanda" });
    expect(env.error?.code).toBe("blocked_by_policy");
  });
});
