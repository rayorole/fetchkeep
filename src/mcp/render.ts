import type { Envelope } from "../core/schema.js";

const OPEN = "<untrusted-web-content";
const CLOSE = "</untrusted-web-content>";

/** Neutralizes delimiter look-alikes so page text cannot close the untrusted section early. */
function fence(text: string): string {
  return text.replace(/<\/?untrusted-web-content/gi, (m) => m.replace("<", "&lt;"));
}

/**
 * Human/LLM-readable rendering of an envelope. Page content is wrapped in an explicit untrusted-data section and is
 * never interleaved with tool guidance.
 */
export function renderEnvelope(env: Envelope): string {
  const lines: string[] = [`status: ${env.status}`];
  if (env.error) {
    lines.push(`error: ${env.error.code}: ${env.error.message}`);
    if (env.error.hint) lines.push(`hint: ${env.error.hint}`);
  }
  const d = env.document;
  if (d) {
    lines.push(`title: ${d.title}`, `url: ${d.finalUrl}`);
    if (d.requestedUrl !== d.finalUrl) lines.push(`requested_url: ${d.requestedUrl}`);
    lines.push(`fetched_at: ${d.fetchedAt}`, `content_type: ${d.contentType}`, `http_status: ${d.httpStatus}`);
    if (d.saved) lines.push(`ref: ${d.ref}${d.unchanged ? " (unchanged since last fetch)" : ""}`);
  }
  if (env.backend) {
    const tried = env.backend.attempts.map((a) => `${a.backend}:${a.outcome}${a.reason ? ` (${a.reason})` : ""}`).join(" → ");
    lines.push(`backend: ${env.backend.used ?? "none"} [mode ${env.backend.mode}] ${tried}`);
  }
  if (env.truncation?.truncated) {
    const t = env.truncation;
    lines.push(
      `truncated: ${t.reasons.join(", ")}; returned ${t.returnedChars} of ${t.totalChars} chars from offset ${t.offset}` +
        (t.nextOffset !== null ? `; continue with offset=${t.nextOffset}` : ""),
    );
  }
  for (const w of env.warnings) lines.push(`warning: ${w}`);

  const data = env.data as Record<string, unknown> | undefined;
  if (env.tool === "web_search" && data && Array.isArray(data.results)) {
    lines.push(`results: ${data.results.length}`);
    const body = (data.results as Record<string, unknown>[])
      .map((r, i) => {
        const head = `[${i + 1}] ${String(r.title ?? "")}\n    ${String(r.url ?? "")}${r.ref ? `\n    ref: ${String(r.ref)}` : ""}`;
  } else if (env.tool === "doctor" && data && Array.isArray(data.checks)) {
    lines.push(`fetchkeep ${String(data.version)} on ${String(data.platform)}`);
    for (const c of data.checks as { name: string; ok: boolean; detail: string }[]) lines.push(`${c.ok ? "ok  " : "FAIL"} ${c.name}: ${c.detail}`);
  } else if (data && env.tool !== "web_read" && env.tool !== "web_fetch") {
      })
      .join("\n");
    if (body) lines.push("", `${OPEN} kind="search-results">`, fence(body), CLOSE);
  } else if (data && env.tool !== "web_read" && env.tool !== "web_fetch") {
    lines.push("", "data:", fence(JSON.stringify(data, null, 2)));
  }
  if (env.tool === "web_read" && data && Array.isArray(data.matches)) {
    for (const m of data.matches as { citation: { ref: string }; quote: string }[]) lines.push(`match: ${m.citation.ref} "${m.quote}"`);
  }
  if (env.content?.text) {
    const src = d ? ` source="${d.finalUrl}" ref="${d.ref}"` : "";
    lines.push("", `${OPEN}${src}>`, fence(env.content.text), CLOSE);
  }
  return lines.join("\n");
}
