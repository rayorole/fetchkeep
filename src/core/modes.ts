/** Shared CLI and schema choices; importing these must not load validation or retrieval engines. */
export const BACKENDS = ["http", "chromium", "lightpanda"] as const;
export const FETCH_MODES = ["http", "auto", "chromium", "lightpanda", "browser"] as const;
