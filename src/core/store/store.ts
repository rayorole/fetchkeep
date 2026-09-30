import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SQLInputValue } from "node:sqlite";
import { gunzipSync, gzipSync } from "node:zlib";
import { FetchkeepError } from "../errors.js";
import type { FetchedPage } from "../fetch-http.js";
import { sha256 } from "../hash.js";
import type { BackendName, Block, BlockType, ExtractionStrategy } from "../schema.js";
import { normalizeUrl } from "../url.js";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.sql.js";

export type RawSnapshotPolicy = "all" | "latest" | "none";

export interface VersionMeta {
  lang?: string;
  siteName?: string;
  byline?: string;
  description?: string;
  publishedAt?: string;
  canonicalUrl?: string;
  warnings: string[];
  stats: Record<string, number>;
  redirects: { url: string; status: number }[];
}

export interface StoredVersion {
  docId: string;
  version: number;
  ref: string;
  fetchedAt: string;
  lastSeenAt: string;
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  title: string;
  contentHash: string;
  rawHash: string | null;
  hasSnapshot: boolean;
  extractorVersion: string;
  strategy: ExtractionStrategy;
  backend: BackendName;
  markdown: string;
  meta: VersionMeta;
  latestVersion: number;
}

export interface SaveResult {
  docId: string;
  version: number;
  unchanged: boolean;
  contentHash: string;
}

export interface SearchHit {
  ref: string;
  docId: string;
  version: number;
  blockId: string;
  type: BlockType;
  url: string;
  title: string;
  fetchedAt: string;
  snippet: string;
  text: string;
  score: number;
}

export interface DocumentSummary {
  docId: string;
  url: string;
  title: string;
  latestVersion: number;
  versions: number;
  updatedAt: string;
}

export interface PruneOptions {
  /** Keep only the newest N versions of each document (N ≥ 1). */
  keepVersions?: number;
  /** Delete non-latest versions fetched before this ISO timestamp. */
  olderThan?: string;
  /** Drop raw snapshots: `all` removes every snapshot, `old` keeps only the latest version's snapshot. */
  raw?: "all" | "old";
}

export interface PruneResult {
  versionsDeleted: number;
  snapshotsDeleted: number;
}

const WORKSPACE_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export function docIdFor(url: string): string {
  return `d_${sha256(normalizeUrl(url)).slice(0, 16)}`;
}

export function versionRef(docId: string, version: number, blockId?: string): string {
  return `fk:${docId}@${version}${blockId ? `#${blockId}` : ""}`;
}

export interface ParsedRef {
  docId: string;
  version?: number;
  blockId?: string;
}

/** Parses `fk:<docId>[@<version>][#<blockId>]` (the `fk:` prefix is optional). Returns null for non-refs. */
export function parseRef(ref: string): ParsedRef | null {
  const m = /^(?:fk:)?(d_[0-9a-f]{16})(?:@(\d+))?(?:#(b\d+))?$/.exec(ref.trim());
  if (!m) return null;
  const out: ParsedRef = { docId: m[1]! };
  if (m[2]) out.version = Number(m[2]);
  if (m[3]) out.blockId = m[3];
  return out;
}

/** Converts free text into a safe FTS5 query: every token quoted, implicit AND; `OR` kept as an operator. */
export function toFtsQuery(input: string): string {
  const tokens = input.match(/"[^"]+"|\S+/g) ?? [];
  const parts: string[] = [];
  for (const t of tokens) {
    if (t === "OR") {
      if (parts.length) parts.push("OR");
      continue;
    }
    const phrase = t.startsWith('"') ? t.slice(1, -1) : t;
    const clean = phrase.replace(/"/g, "").trim();
    if (!clean) continue;
    const prefix = !t.startsWith('"') && clean.endsWith("*");
    parts.push(`"${prefix ? clean.slice(0, -1) : clean}"${prefix ? "*" : ""}`);
  }
  while (parts.at(-1) === "OR") parts.pop();
  return parts.join(" ");
}

interface VersionRow {
  doc_id: string;
  version: number;
  fetched_at: string;
  last_seen_at: string;
  requested_url: string;
  final_url: string;
  http_status: number;
  content_type: string;
  title: string;
  content_hash: string;
  raw_hash: string | null;
  snapshot_hash: string | null;
  extractor_version: string;
  strategy: string;
  backend: string;
  markdown: string;
  meta_json: string;
  latest_version: number;
}

interface BlockRow {
  block_id: string;
  type: string;
  level: number | null;
  lang: string | null;
  page: number | null;
  text: string;
  markdown: string;
  hash: string;
  offset: number;
}

/** A workspace-local SQLite store. One instance per workspace directory. */
export class Store {
  readonly db: DatabaseSync;

  private constructor(readonly path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;");
    this.db.exec(SCHEMA_SQL);
    const row = this.db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string } | undefined;
    if (!row) this.db.prepare("INSERT INTO meta(key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
    else if (Number(row.value) > SCHEMA_VERSION) {
      throw new FetchkeepError("internal", `Store ${path} was created by a newer Fetchkeep (schema ${row.value}); upgrade Fetchkeep.`);
    }
  }

  /** Opens (creating if needed) the store of a workspace below `home`. */
  static openWorkspace(home: string, workspace: string): Store {
    if (!WORKSPACE_RE.test(workspace)) {
      throw new FetchkeepError("invalid_argument", `Invalid workspace name "${workspace}" (use letters, digits, '-' and '_')`);
    }
    const dir = join(home, "workspaces", workspace);
    mkdirSync(dir, { recursive: true });
    return new Store(join(dir, "fetchkeep.sqlite"));
  }

  static openFile(path: string): Store {
    return new Store(path);
  }

  close(): void {
    this.db.close();
  }

  private tx<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const out = fn();
      this.db.exec("COMMIT");
      return out;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  /** Saves a fetched page. Identical extracted Markdown for the same document does not create a new version. */
  save(page: FetchedPage, rawPolicy: RawSnapshotPolicy): SaveResult {
    const key = normalizeUrl(page.finalUrl);
    const contentHash = sha256(page.extracted.markdown);
    const now = new Date().toISOString();
    return this.tx(() => {
      let doc = this.db.prepare("SELECT id, latest_version FROM documents WHERE url = ?").get(key) as
        | { id: string; latest_version: number }
        | undefined;
      const docId = doc?.id ?? docIdFor(key);
      if (!doc) {
        this.db.prepare("INSERT INTO documents(id, url, created_at, updated_at, latest_version) VALUES (?, ?, ?, ?, 0)").run(docId, key, now, now);
        doc = { id: docId, latest_version: 0 };
      }
      for (const alias of new Set([normalizeUrl(page.requestedUrl), ...page.redirects.map((r) => normalizeUrl(r.url))])) {
        if (alias !== key) this.db.prepare("INSERT OR IGNORE INTO aliases(url, doc_id) VALUES (?, ?)").run(alias, docId);
      }
      if (doc.latest_version > 0) {
        const latest = this.db
          .prepare("SELECT content_hash FROM versions WHERE doc_id = ? AND version = ?")
          .get(doc.id, doc.latest_version) as { content_hash: string } | undefined;
        if (latest?.content_hash === contentHash) {
          this.db.prepare("UPDATE versions SET last_seen_at = ? WHERE doc_id = ? AND version = ?").run(page.fetchedAt, doc.id, doc.latest_version);
          this.db.prepare("UPDATE documents SET updated_at = ? WHERE id = ?").run(now, doc.id);
          return { docId: doc.id, version: doc.latest_version, unchanged: true, contentHash };
        }
      }
      const version = doc.latest_version + 1;

      let snapshotHash: string | null = null;
      if (rawPolicy !== "none") {
        snapshotHash = page.rawHash;
        this.db
          .prepare("INSERT OR IGNORE INTO snapshots(hash, content_type, bytes, body, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(snapshotHash, page.contentTypeHeader || page.contentType, page.body.length, gzipSync(page.body), now);
      }

      const ex = page.extracted;
      const meta: VersionMeta = { warnings: ex.warnings, stats: ex.stats, redirects: page.redirects };
      if (ex.lang) meta.lang = ex.lang;
      if (ex.siteName) meta.siteName = ex.siteName;
      if (ex.byline) meta.byline = ex.byline;
      if (ex.description) meta.description = ex.description;
      if (ex.publishedAt) meta.publishedAt = ex.publishedAt;
      if (ex.canonicalUrl) meta.canonicalUrl = ex.canonicalUrl;

      this.db
        .prepare(
          `INSERT INTO versions(doc_id, version, fetched_at, last_seen_at, requested_url, final_url, http_status, content_type, title,
            content_hash, raw_hash, snapshot_hash, extractor_version, strategy, backend, markdown, meta_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          docId, version, page.fetchedAt, page.fetchedAt, page.requestedUrl, page.finalUrl, page.httpStatus, page.contentType, ex.title,
          contentHash, page.rawHash, snapshotHash, ex.extractorVersion, ex.strategy, page.backend, ex.markdown, JSON.stringify(meta),
        );
      const ins = this.db.prepare(
        `INSERT INTO blocks(doc_id, version, idx, block_id, type, level, lang, page, text, markdown, hash, offset, title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      ex.blocks.forEach((b, i) =>
        ins.run(docId, version, i, b.id, b.type, b.level ?? null, b.lang ?? null, b.page ?? null, b.text, b.markdown, b.hash, b.offset, ex.title),
      );
      this.db.prepare("UPDATE documents SET latest_version = ?, updated_at = ? WHERE id = ?").run(version, now, docId);

      if (rawPolicy === "latest") {
        this.db.prepare("UPDATE versions SET snapshot_hash = NULL WHERE doc_id = ? AND version < ?").run(docId, version);
        this.deleteOrphanSnapshots();
      }
      return { docId, version, unchanged: false, contentHash };
    });
  }

  private deleteOrphanSnapshots(): number {
    return Number(
      this.db.prepare("DELETE FROM snapshots WHERE hash NOT IN (SELECT snapshot_hash FROM versions WHERE snapshot_hash IS NOT NULL)").run().changes,
    );
  }

  /** Resolves a document id, `fk:` ref or URL (including pre-redirect aliases) to a document id. */
  resolveDocId(target: string): string | null {
    const ref = parseRef(target);
    if (ref) {
      const exists = this.db.prepare("SELECT 1 FROM documents WHERE id = ?").get(ref.docId);
      return exists ? ref.docId : null;
    }
    let key: string;
    try {
      key = normalizeUrl(target);
    } catch {
      return null;
    }
    const direct = this.db.prepare("SELECT id FROM documents WHERE url = ?").get(key) as { id: string } | undefined;
    if (direct) return direct.id;
    const alias = this.db.prepare("SELECT doc_id FROM aliases WHERE url = ?").get(key) as { doc_id: string } | undefined;
    return alias?.doc_id ?? null;
  }

  getVersion(docId: string, version?: number): StoredVersion | null {
    const row = this.db
      .prepare(
        `SELECT v.*, d.latest_version FROM versions v JOIN documents d ON d.id = v.doc_id
         WHERE v.doc_id = ? AND v.version = COALESCE(?, d.latest_version)`,
      )
      .get(docId, version ?? null) as VersionRow | undefined;
    return row ? toStoredVersion(row) : null;
  }

  listVersions(docId: string): { version: number; fetchedAt: string; lastSeenAt: string; contentHash: string; backend: string }[] {
    return (
      this.db
        .prepare("SELECT version, fetched_at, last_seen_at, content_hash, backend FROM versions WHERE doc_id = ? ORDER BY version")
        .all(docId) as { version: number; fetched_at: string; last_seen_at: string; content_hash: string; backend: string }[]
    ).map((r) => ({ version: r.version, fetchedAt: r.fetched_at, lastSeenAt: r.last_seen_at, contentHash: r.content_hash, backend: r.backend }));
  }

  getBlocks(docId: string, version: number): Block[] {
    const rows = this.db
      .prepare("SELECT block_id, type, level, lang, page, text, markdown, hash, offset FROM blocks WHERE doc_id = ? AND version = ? ORDER BY idx")
      .all(docId, version) as unknown as BlockRow[];
    return rows.map(toBlock);
  }

  getSnapshot(hash: string): { contentType: string; body: Buffer } | null {
    const row = this.db.prepare("SELECT content_type, body FROM snapshots WHERE hash = ?").get(hash) as
      | { content_type: string; body: Uint8Array }
      | undefined;
    return row ? { contentType: row.content_type, body: gunzipSync(row.body) } : null;
  }

  listDocuments(limit = 50, offset = 0): DocumentSummary[] {
    const rows = this.db
      .prepare(
        `SELECT d.id, d.url, d.latest_version, d.updated_at, v.title, (SELECT COUNT(*) FROM versions x WHERE x.doc_id = d.id) AS n
         FROM documents d JOIN versions v ON v.doc_id = d.id AND v.version = d.latest_version
         ORDER BY d.updated_at DESC, d.id LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as { id: string; url: string; latest_version: number; updated_at: string; title: string; n: number }[];
    return rows.map((r) => ({ docId: r.id, url: r.url, title: r.title, latestVersion: r.latest_version, versions: r.n, updatedAt: r.updated_at }));
  }

  countDocuments(): number {
    return (this.db.prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number }).n;
  }

  /** Full-text search over blocks of the latest version of each document (or all versions). */
  search(query: string, opts: { limit?: number; allVersions?: boolean; docId?: string; raw?: boolean } = {}): SearchHit[] {
    const fts = opts.raw ? query : toFtsQuery(query);
    if (!fts) return [];
    const where: string[] = ["blocks_fts MATCH ?"];
    const params: SQLInputValue[] = [fts];
    if (!opts.allVersions) where.push("b.version = d.latest_version");
    if (opts.docId) {
      where.push("b.doc_id = ?");
      params.push(opts.docId);
    }
    params.push(Math.min(Math.max(opts.limit ?? 10, 1), 200));
    try {
      const rows = this.db
        .prepare(
          `SELECT b.doc_id, b.version, b.block_id, b.type, b.text, v.final_url, v.title, v.fetched_at,
                  snippet(blocks_fts, 0, '«', '»', '…', 24) AS snip, bm25(blocks_fts, 1.0, 0.5) AS score
           FROM blocks_fts JOIN blocks b ON b.rowid = blocks_fts.rowid
           JOIN versions v ON v.doc_id = b.doc_id AND v.version = b.version
           JOIN documents d ON d.id = b.doc_id
           WHERE ${where.join(" AND ")}
           ORDER BY score LIMIT ?`,
        )
        .all(...params) as {
        doc_id: string; version: number; block_id: string; type: string; text: string; final_url: string; title: string;
        fetched_at: string; snip: string; score: number;
      }[];
      return rows.map((r) => ({
        ref: versionRef(r.doc_id, r.version, r.block_id),
        docId: r.doc_id,
        version: r.version,
        blockId: r.block_id,
        type: r.type as BlockType,
        url: r.final_url,
        title: r.title,
        fetchedAt: r.fetched_at,
        snippet: r.snip,
        text: r.text,
        score: -r.score,
      }));
    } catch (err) {
      throw new FetchkeepError("invalid_argument", `Invalid search query: ${(err as Error).message}`);
    }
  }

  deleteDocument(docId: string): boolean {
    return this.tx(() => {
      const changed = Number(this.db.prepare("DELETE FROM documents WHERE id = ?").run(docId).changes);
      this.deleteOrphanSnapshots();
      return changed > 0;
    });
  }

  prune(opts: PruneOptions): PruneResult {
    return this.tx(() => {
      let versionsDeleted = 0;
      if (opts.keepVersions !== undefined) {
        const keep = Math.max(1, Math.floor(opts.keepVersions));
        versionsDeleted += Number(
          this.db.prepare("DELETE FROM versions WHERE version <= (SELECT latest_version FROM documents d WHERE d.id = versions.doc_id) - ?").run(keep).changes,
        );
      }
      if (opts.olderThan) {
        versionsDeleted += Number(
          this.db
            .prepare("DELETE FROM versions WHERE fetched_at < ? AND version < (SELECT latest_version FROM documents d WHERE d.id = versions.doc_id)")
            .run(opts.olderThan).changes,
        );
      }
      if (opts.raw === "all") this.db.exec("UPDATE versions SET snapshot_hash = NULL");
      if (opts.raw === "old") {
        this.db.exec("UPDATE versions SET snapshot_hash = NULL WHERE version < (SELECT latest_version FROM documents d WHERE d.id = versions.doc_id)");
      }
      const snapshotsDeleted = this.deleteOrphanSnapshots();
      return { versionsDeleted, snapshotsDeleted };
    });
  }

  /** Iterates every stored version (oldest first) for export. */
  *exportVersions(opts: { includeRaw?: boolean } = {}): Generator<Record<string, unknown>> {
    const rows = this.db
      .prepare("SELECT v.*, d.latest_version FROM versions v JOIN documents d ON d.id = v.doc_id ORDER BY v.doc_id, v.version")
      .iterate() as IterableIterator<VersionRow>;
    for (const row of rows) {
      const v = toStoredVersion(row);
      const record: Record<string, unknown> = { ...v, blocks: this.getBlocks(v.docId, v.version) };
      if (opts.includeRaw && row.snapshot_hash) {
        const snap = this.getSnapshot(row.snapshot_hash);
        if (snap) record.raw = { contentType: snap.contentType, base64: snap.body.toString("base64") };
      }
      yield record;
    }
  }
}

function toStoredVersion(r: VersionRow): StoredVersion {
  return {
    docId: r.doc_id,
    version: r.version,
    ref: versionRef(r.doc_id, r.version),
    fetchedAt: r.fetched_at,
    lastSeenAt: r.last_seen_at,
    requestedUrl: r.requested_url,
    finalUrl: r.final_url,
    httpStatus: r.http_status,
    contentType: r.content_type,
    title: r.title,
    contentHash: r.content_hash,
    rawHash: r.raw_hash,
    hasSnapshot: r.snapshot_hash !== null,
    extractorVersion: r.extractor_version,
    strategy: r.strategy as ExtractionStrategy,
    backend: r.backend as BackendName,
    markdown: r.markdown,
    meta: JSON.parse(r.meta_json) as VersionMeta,
    latestVersion: r.latest_version,
  };
}

function toBlock(r: BlockRow): Block {
  const b: Block = { id: r.block_id, type: r.type as BlockType, text: r.text, markdown: r.markdown, hash: r.hash, offset: r.offset };
  if (r.level !== null) b.level = r.level;
  if (r.lang !== null) b.lang = r.lang;
  if (r.page !== null) b.page = r.page;
  return b;
}
