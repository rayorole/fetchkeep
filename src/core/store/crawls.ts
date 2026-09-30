import type { DatabaseSync } from "node:sqlite";

export type CrawlUrlState = "queued" | "done" | "failed" | "skipped";
export type CrawlStatus = "running" | "completed" | "stopped";

export interface CrawlRecord {
  id: string;
  rootUrl: string;
  options: Record<string, unknown>;
  status: CrawlStatus;
  stopReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlUrlRecord {
  url: string;
  depth: number;
  seq: number;
  state: CrawlUrlState;
  reason: string | null;
  docId: string | null;
  version: number | null;
  contentHash: string | null;
  source: string;
}

interface CrawlUrlRow {
  url: string;
  depth: number;
  seq: number;
  state: string;
  reason: string | null;
  doc_id: string | null;
  version: number | null;
  content_hash: string | null;
  source: string;
}

/** Persistence for crawl jobs and their frontier (same SQLite file as the document store). */
export class CrawlRepo {
  constructor(private readonly db: DatabaseSync) {}

  create(id: string, rootUrl: string, options: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.db
      .prepare("INSERT INTO crawls(id, root_url, options_json, status, stop_reason, created_at, updated_at) VALUES (?, ?, ?, 'running', NULL, ?, ?)")
      .run(id, rootUrl, JSON.stringify(options), now, now);
  }

  get(id: string): CrawlRecord | null {
    const r = this.db.prepare("SELECT * FROM crawls WHERE id = ?").get(id) as
      | { id: string; root_url: string; options_json: string; status: string; stop_reason: string | null; created_at: string; updated_at: string }
      | undefined;
    if (!r) return null;
    return {
      id: r.id,
      rootUrl: r.root_url,
      options: JSON.parse(r.options_json) as Record<string, unknown>,
      status: r.status as CrawlStatus,
      stopReason: r.stop_reason,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  list(limit = 20): CrawlRecord[] {
    const ids = this.db.prepare("SELECT id FROM crawls ORDER BY created_at DESC LIMIT ?").all(limit) as { id: string }[];
    return ids.map((r) => this.get(r.id)!);
  }

  finish(id: string, status: CrawlStatus, stopReason: string): void {
    this.db.prepare("UPDATE crawls SET status = ?, stop_reason = ?, updated_at = ? WHERE id = ?").run(status, stopReason, new Date().toISOString(), id);
  }

  /** Adds a URL to the frontier; returns false if it was already known to this crawl. */
  add(id: string, url: string, depth: number, source: string, state: CrawlUrlState = "queued", reason: string | null = null): boolean {
    const seq = (this.db.prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM crawl_urls WHERE crawl_id = ?").get(id) as { n: number }).n;
    const res = this.db
      .prepare("INSERT OR IGNORE INTO crawl_urls(crawl_id, url, depth, seq, state, reason, source) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, url, depth, seq, state, reason, source);
    return Number(res.changes) > 0;
  }

  has(id: string, url: string): boolean {
    return this.db.prepare("SELECT 1 FROM crawl_urls WHERE crawl_id = ? AND url = ?").get(id, url) !== undefined;
  }

  update(
    id: string,
    url: string,
    state: CrawlUrlState,
    fields: { reason?: string | null; docId?: string | null; version?: number | null; contentHash?: string | null } = {},
  ): void {
    this.db
      .prepare("UPDATE crawl_urls SET state = ?, reason = ?, doc_id = ?, version = ?, content_hash = ? WHERE crawl_id = ? AND url = ?")
      .run(state, fields.reason ?? null, fields.docId ?? null, fields.version ?? null, fields.contentHash ?? null, id, url);
  }

  /** Breadth-first order: shallowest first, then discovery order. */
  queued(id: string): CrawlUrlRecord[] {
    return (this.db.prepare("SELECT * FROM crawl_urls WHERE crawl_id = ? AND state = 'queued' ORDER BY depth, seq").all(id) as unknown as CrawlUrlRow[]).map(toRecord);
  }

  all(id: string): CrawlUrlRecord[] {
    return (this.db.prepare("SELECT * FROM crawl_urls WHERE crawl_id = ? ORDER BY seq").all(id) as unknown as CrawlUrlRow[]).map(toRecord);
  }
}

function toRecord(r: CrawlUrlRow): CrawlUrlRecord {
  return {
    url: r.url,
    depth: r.depth,
    seq: r.seq,
    state: r.state as CrawlUrlState,
    reason: r.reason,
    docId: r.doc_id,
    version: r.version,
    contentHash: r.content_hash,
    source: r.source,
  };
}
