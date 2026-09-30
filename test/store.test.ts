import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Envelope } from "../src/core/schema.js";
import type { Fetchkeep } from "../src/core/service.js";
import { Store, toFtsQuery } from "../src/core/store/store.js";
import { startServer, type TestServer } from "./support/server.js";
import { tempHome, testService } from "./support/service.js";

let srv: TestServer;
let body = "";
const page = (para: string) =>
  `<html><head><title>Changing page</title></head><body><main><h1>Changing page</h1><p>${para}</p><h2>Stable section</h2><p>The quick brown fox jumps over the lazy dog.</p><pre><code class="language-py">print("héllo")\nx = 1</code></pre></main></body></html>`;

beforeAll(async () => {
  body = page("First revision of the content about zebras.");
  srv = await startServer({
    "/doc": (_q, res) => void res.writeHead(200, { "content-type": "text/html" }).end(body),
    "/alias": (_q, res) => void res.writeHead(301, { location: "/doc" }).end(),
    "/other": (_q, res) =>
      void res.writeHead(200, { "content-type": "text/html" }).end("<html><head><title>Other</title></head><body><p>Giraffes and zebras share the savanna.</p></body></html>"),
  });
});
afterAll(() => srv.close());

const u = (p: string) => `http://localhost:${srv.port}${p}`;

function ok(env: Envelope): Envelope {
  expect(Envelope.parse(env)).toBeTruthy();
  expect(env.error, JSON.stringify(env.error)).toBeUndefined();
  return env;
}

describe("versions and citations", () => {
  const { home, cleanup } = tempHome();
  let fk: Fetchkeep;
  beforeAll(() => {
    fk = testService(home);
  });
  afterAll(async () => {
    await fk.close();
    cleanup();
  });

  it("creates a version only when extracted content changes", async () => {
    body = page("First revision of the content about zebras.");
    const a = ok(await fk.fetch({ url: u("/doc") }));
    expect(a.document).toMatchObject({ version: 1, saved: true, unchanged: false });
    const again = ok(await fk.fetch({ url: u("/alias") }));
    expect(again.document).toMatchObject({ id: a.document!.id, version: 1, unchanged: true });
    body = page("Second revision mentions elephants instead.");
    const b = ok(await fk.fetch({ url: u("/doc") }));
    expect(b.document).toMatchObject({ id: a.document!.id, version: 2, unchanged: false });
    expect(b.citation?.ref).toBe(`fk:${a.document!.id}@2`);
  });

  it("reads exact blocks by stable reference, per version", () => {
    const id = fk.store.resolveDocId(u("/doc"))!;
    const v1 = ok(fk.read({ target: `fk:${id}@1#b2` }));
    expect(v1.content?.text).toBe("First revision of the content about zebras.");
    expect(v1.content?.blocks?.[0]).toMatchObject({ id: "b2", type: "paragraph" });
    const cites = (v1.data as { citations: { ref: string; quote: string; blockHash: string }[] }).citations;
    expect(cites[0]).toMatchObject({ ref: `fk:${id}@1#b2`, quote: "First revision of the content about zebras." });
    const latest = ok(fk.read({ target: u("/alias"), blocks: "b2" }));
    expect(latest.document?.version).toBe(2);
    expect(latest.content?.text).toBe("Second revision mentions elephants instead.");
    // Same reference, same bytes, every time.
    expect(ok(fk.read({ target: `fk:${id}@1#b2` })).content?.text).toBe(v1.content?.text);
  });

  it("finds exact quotations and returns their source span", () => {
    const env = ok(fk.read({ target: u("/doc"), find: "QUICK   brown fox" }));
    const m = (env.data as { matches: { blockId: string; quote: string; citation: { ref: string } }[] }).matches;
    expect(m).toHaveLength(1);
    expect(m[0]!.quote).toBe("quick brown fox");
    expect(m[0]!.citation.ref).toMatch(/@2#b4$/);
    const code = ok(fk.read({ target: u("/doc"), find: 'print("héllo") x = 1' }));
    expect((code.data as { matches: { quote: string }[] }).matches[0]!.quote).toBe('print("héllo")\nx = 1');
    const miss = fk.read({ target: u("/doc"), find: "not in the page" });
    expect(miss.status).toBe("partial");
  });

  it("paginates with offsets that resume exactly", () => {
    const first = ok(fk.read({ target: u("/doc"), maxChars: 120 }));
    expect(first.truncation?.truncated).toBe(true);
    const rest = ok(fk.read({ target: u("/doc"), offset: first.truncation!.nextOffset!, maxChars: 100_000 }));
    const full = ok(fk.read({ target: u("/doc") }));
    expect(full.content!.text.startsWith(first.content!.text)).toBe(true);
    expect(full.content!.text.endsWith(rest.content!.text)).toBe(true);
  });

  it("returns structured not_found errors", () => {
    expect(fk.read({ target: "https://never-fetched.example/" }).error?.code).toBe("not_found");
    expect(fk.read({ target: u("/doc"), version: 99 }).error?.code).toBe("not_found");
  });
});

describe("local search", () => {
  const { home, cleanup } = tempHome();
  let fk: Fetchkeep;
  beforeAll(async () => {
    fk = testService(home);
    body = page("Zebras have stripes and graze in herds.");
    ok(await fk.fetch({ url: u("/doc") }));
    ok(await fk.fetch({ url: u("/other") }));
    body = page("Now the page is about penguins.");
    ok(await fk.fetch({ url: u("/doc") }));
  });
  afterAll(async () => {
    await fk.close();
    cleanup();
  });

  it("searches offline with snippets and block references", async () => {
    await srv.close();
    const env = ok(await fk.search({ query: "zebras" }));
    const results = (env.data as { results: { ref: string; snippet: string; title: string }[] }).results;
    // Only the latest version of each document is searched by default.
    expect(results.map((r) => r.title)).toEqual(["Other"]);
    expect(results[0]!.snippet).toContain("«zebras»");
    expect(results[0]!.ref).toMatch(/^fk:d_[0-9a-f]{16}@1#b\d+$/);
    const all = ok(await fk.search({ query: "zebras", allVersions: true }));
    expect((all.data as { results: unknown[] }).results).toHaveLength(2);
    const stem = ok(await fk.search({ query: "penguin" }));
    expect((stem.data as { results: unknown[] }).results).toHaveLength(1);
    srv = await startServer({}); // keep afterAll close() valid
  });

  it("never fails on FTS syntax characters", async () => {
    for (const q of ['"unbalanced', "a AND OR", "c++ (x)", "NEAR(", "*", "-foo"]) {
      const env = await fk.search({ query: q });
      expect(env.status, q).toBe("success");
    }
    expect(toFtsQuery('foo "exact phrase" bar* OR')).toBe('"foo" "exact phrase" "bar"*');
  });

  it("requires an explicitly configured provider for web search", async () => {
    const env = await fk.search({ query: "zebras", source: "web" });
    expect(env.error?.code).toBe("search_provider_unavailable");
  });
});

describe("retention, export, deletion and workspaces", () => {
  it("keeps raw snapshots per policy, prunes, exports and deletes", async () => {
    const { home, cleanup } = tempHome();
    await srv.close();
    srv = await startServer({
      "/doc": (_q, res) => void res.writeHead(200, { "content-type": "text/html" }).end(body),
    });
    const fk = testService(home, { rawSnapshots: "all" });
    try {
      for (const t of ["one", "two", "three"]) {
        body = page(`Revision ${t}.`);
        ok(await fk.fetch({ url: u("/doc") }));
      }
      const id = fk.store.resolveDocId(u("/doc"))!;
      const snapshots = () => (fk.store.db.prepare("SELECT COUNT(*) AS n FROM snapshots").get() as { n: number }).n;
      expect(snapshots()).toBe(3);
      const v1 = fk.store.getVersion(id, 1)!;
      expect(fk.store.getSnapshot(v1.rawHash!)!.body.toString()).toContain("Revision one.");

      const exported = [...fk.store.exportVersions()];
      expect(exported.map((r) => r.version)).toEqual([1, 2, 3]);

      expect(fk.store.prune({ keepVersions: 2 })).toEqual({ versionsDeleted: 1, snapshotsDeleted: 1 });
      expect(fk.store.listVersions(id).map((v) => v.version)).toEqual([2, 3]);
      expect(fk.store.prune({ raw: "old" })).toEqual({ versionsDeleted: 0, snapshotsDeleted: 1 });
      expect(fk.store.getVersion(id)!.hasSnapshot).toBe(true);

      expect(fk.store.deleteDocument(id)).toBe(true);
      expect(fk.store.countDocuments()).toBe(0);
      expect(snapshots()).toBe(0);
      expect(fk.store.search("Revision")).toEqual([]);
    } finally {
      await fk.close();
      cleanup();
    }
  });

  it("keeps only the latest snapshot by default", async () => {
    const { home, cleanup } = tempHome();
    const fk = testService(home);
    try {
      for (const t of ["a", "b"]) {
        body = page(`Snapshot ${t}.`);
        ok(await fk.fetch({ url: u("/doc") }));
      }
      const id = fk.store.resolveDocId(u("/doc"))!;
      expect(fk.store.getVersion(id, 1)!.hasSnapshot).toBe(false);
      expect(fk.store.getVersion(id, 2)!.hasSnapshot).toBe(true);
    } finally {
      await fk.close();
      cleanup();
    }
  });

  it("isolates workspaces", async () => {
    const { home, cleanup } = tempHome();
    const a = testService(home, { workspace: "alpha" });
    const b = testService(home, { workspace: "beta" });
    try {
      body = page("Only in alpha: aardvark.");
      ok(await a.fetch({ url: u("/doc") }));
      expect(a.store.search("aardvark")).toHaveLength(1);
      expect(b.store.search("aardvark")).toHaveLength(0);
      expect(b.read({ target: u("/doc") }).error?.code).toBe("not_found");
      expect(() => Store.openWorkspace(home, "../escape")).toThrow(/Invalid workspace/);
    } finally {
      await a.close();
      await b.close();
      cleanup();
    }
  });
});
