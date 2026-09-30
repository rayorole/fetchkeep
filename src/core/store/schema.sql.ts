/** SQLite schema, version 1. Raw snapshots and extracted content live in separate tables. */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  latest_version INTEGER NOT NULL
);

-- Other URLs (requested URLs before redirects) that resolve to a document.
CREATE TABLE IF NOT EXISTS aliases (
  url TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE
);

-- Source snapshots: the bytes exactly as received (gzip-compressed at rest), content-addressed by SHA-256.
CREATE TABLE IF NOT EXISTS snapshots (
  hash TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  body BLOB NOT NULL,
  created_at TEXT NOT NULL
);

-- Normalized extracted content, one row per distinct extraction result of a document.
CREATE TABLE IF NOT EXISTS versions (
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  fetched_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  requested_url TEXT NOT NULL,
  final_url TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  raw_hash TEXT,
  snapshot_hash TEXT REFERENCES snapshots(hash) ON DELETE SET NULL,
  extractor_version TEXT NOT NULL,
  strategy TEXT NOT NULL,
  backend TEXT NOT NULL,
  markdown TEXT NOT NULL,
  meta_json TEXT NOT NULL,
  PRIMARY KEY (doc_id, version)
);

CREATE TABLE IF NOT EXISTS blocks (
  rowid INTEGER PRIMARY KEY,
  doc_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  idx INTEGER NOT NULL,
  block_id TEXT NOT NULL,
  type TEXT NOT NULL,
  level INTEGER,
  lang TEXT,
  page INTEGER,
  text TEXT NOT NULL,
  markdown TEXT NOT NULL,
  hash TEXT NOT NULL,
  offset INTEGER NOT NULL,
  title TEXT NOT NULL,
  UNIQUE (doc_id, version, idx),
  FOREIGN KEY (doc_id, version) REFERENCES versions(doc_id, version) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
  text, title,
  content = 'blocks', content_rowid = 'rowid',
  tokenize = 'porter unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS blocks_ai AFTER INSERT ON blocks BEGIN
  INSERT INTO blocks_fts(rowid, text, title) VALUES (new.rowid, new.text, new.title);
END;
CREATE TRIGGER IF NOT EXISTS blocks_ad AFTER DELETE ON blocks BEGIN
  INSERT INTO blocks_fts(blocks_fts, rowid, text, title) VALUES ('delete', old.rowid, old.text, old.title);
END;

-- Crawl jobs and their frontier. Persisted so an interrupted crawl can resume without refetching finished pages.
CREATE TABLE IF NOT EXISTS crawls (
  id TEXT PRIMARY KEY,
  root_url TEXT NOT NULL,
  options_json TEXT NOT NULL,
  status TEXT NOT NULL,
  stop_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_urls (
  crawl_id TEXT NOT NULL REFERENCES crawls(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  depth INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  state TEXT NOT NULL,
  reason TEXT,
  doc_id TEXT,
  version INTEGER,
  content_hash TEXT,
  source TEXT NOT NULL,
  PRIMARY KEY (crawl_id, url)
);
CREATE INDEX IF NOT EXISTS crawl_urls_state ON crawl_urls(crawl_id, state, depth, seq);

CREATE INDEX IF NOT EXISTS versions_fetched ON versions(fetched_at);
CREATE INDEX IF NOT EXISTS aliases_doc ON aliases(doc_id);
CREATE INDEX IF NOT EXISTS versions_snapshot ON versions(snapshot_hash);
`;
