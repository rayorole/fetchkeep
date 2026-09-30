import { stripVTControlCharacters } from "node:util";
import { Chalk } from "chalk";
import type { ChalkInstance } from "chalk";
import { Help } from "commander";
import type { Command } from "commander";
import type { Envelope } from "../core/schema.js";

interface TerminalOutput {
  isTTY?: boolean;
  columns?: number;
  write(text: string): unknown;
}

/** Only our own styling may reach a terminal; document bytes in pipes stay untouched. */
export function terminalText(text: string): string {
  // Strip OSC payloads before Node's general ANSI matcher can consume only their prefix.
  const withoutOsc = text.replace(/(?:\u001b\]|\u009d)[\s\S]*?(?:\u0007|\u001b\\|\u009c|$)/g, "");
  return stripVTControlCharacters(withoutOsc)
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "");
}

function colors(stream: TerminalOutput): ChalkInstance {
  return new Chalk({ level: stream.isTTY && process.env.NO_COLOR === undefined && process.env.TERM !== "dumb" && process.env.FORCE_COLOR !== "0" ? 1 : 0 });
}

export function configurePresentation(program: Command): void {
  let helpColor = colors(process.stdout);
  program.configureOutput({
    getOutHasColors: () => colors(process.stdout).level > 0,
    getErrHasColors: () => colors(process.stderr).level > 0,
    // Commander errors can contain user-supplied arguments.
    outputError: (text, write) => write(colors(process.stderr).red(terminalText(text))),
  });
  program.configureHelp({
    showGlobalOptions: true,
    minWidthToWrap: 20,
    formatItem(term, termWidth, description, helper) {
      const width = helper.helpWidth ?? 80;
      if (width >= 60) return Help.prototype.formatItem.call(this, term, termWidth, description, helper);
      const detail = description
        ? `\n${helper.boxWrap(description, Math.max(20, width - 4)).split("\n").map((row) => `    ${row}`).join("\n")}`
        : "";
      return `  ${term}${detail}`;
    },
    prepareContext(context) {
      this.helpWidth = context.helpWidth ?? 80;
      helpColor = colors(context.error ? process.stderr : process.stdout);
    },
    styleTitle: (text) => helpColor.bold(text),
    styleCommandText: (text) => helpColor.bold(text),
    styleSubcommandText: (text) => helpColor.cyan(text),
    styleOptionText: (text) => helpColor.cyan(text),
  });
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

/** Stacked rows remain readable at narrow widths, without clipping URLs or citation refs. */
export function renderHumanEnvelope(env: Envelope, stream: TerminalOutput = process.stderr): string {
  const c = colors(stream);
  const width = stream.isTTY ? Math.max(20, stream.columns ?? 80) : 100;
  const lines: string[] = [];
  function line(value: string, style: (s: string) => string = c): void {
    // Normalize metadata whitespace so a fetched title cannot forge extra result rows.
    const safe = terminalText(value).replace(/\s+/g, " ").trim();
    let rest = safe;
    let indent = "";
    while (rest.length > width - indent.length) {
      const available = width - indent.length;
      const space = rest.lastIndexOf(" ", available);
      // Keep opaque references/URLs intact; the terminal can wrap a long token itself.
      if (space <= 0) break;
      lines.push(style(indent + rest.slice(0, space)));
      rest = rest.slice(space + 1);
      indent = "  ";
    }
    lines.push(style(indent + rest));
  }
  function field(label: string, value: unknown): void {
    const s = text(value);
    if (s) line(`${label}: ${s}`);
  }
  const statusColor = env.status === "success" ? c.green : env.status === "partial" ? c.yellow : c.red;
  const elapsed = env.timings.totalMs;
  line(`${env.status.toUpperCase()}  ${env.tool.replace(/^web_/, "")}${elapsed === undefined ? "" : `  ${Math.round(elapsed)} ms`}`, statusColor.bold);

  const doc = env.document;
  if (doc) {
    line(doc.title || "Untitled document", c.bold);
    line(doc.finalUrl, c.cyan);
    if (doc.requestedUrl !== doc.finalUrl) field("Requested", doc.requestedUrl);
    line(`HTTP ${doc.httpStatus}  |  ${env.backend?.used ?? doc.backend}  |  ${doc.saved ? `saved v${doc.version}${doc.unchanged ? " (unchanged)" : ""}` : "not saved"}`);
    field("ref", env.citation?.ref ?? doc.ref);
  } else if (env.citation) {
    field("ref", env.citation.ref);
  }
  if (env.backend && (!doc || env.backend.escalated || env.status !== "success")) {
    for (const attempt of env.backend.attempts) {
      line(`Backend ${attempt.backend}: ${attempt.outcome} (${Math.round(attempt.durationMs)} ms)${attempt.reason ? ` - ${attempt.reason}` : ""}${attempt.errorCode ? ` [${attempt.errorCode}]` : ""}`);
    }
  }
  if (env.truncation) {
    const t = env.truncation;
    line(`Content: ${t.returnedChars} of ${t.totalChars} characters, offset ${t.offset}${t.truncated ? ` (${t.reasons.join(", ")})` : ""}`);
    if (t.nextOffset !== null && doc) {
      line(doc.saved
        ? `Next: fetchkeep read ${doc.ref} --offset ${t.nextOffset}`
        : `Next: fetchkeep fetch ${JSON.stringify(doc.requestedUrl)} --offset ${t.nextOffset} --no-save`, c.cyan);
    }
  }

  const data = record(env.data);
  switch (env.tool) {
    case "web_search": {
      const results = rows(data.results);
      line(`${results.length} results  |  ${text(data.source)} search  |  ${text(data.query)}`, c.bold);
      field("Workspace", data.workspace);
      field("Provider", data.provider);
      for (const [i, result] of results.entries()) {
        lines.push("");
        line(`${i + 1}. ${text(result.title) || "Untitled document"}`, c.bold);
        field("URL", result.url);
        field("ref", result.ref);
        if (result.snippet) line(text(result.snippet));
      }
      if (!results.length && !env.error) {
        line(data.source === "web"
          ? "Try a broader query or check the configured search provider with fetchkeep doctor."
          : data.documents === 0
            ? "No saved documents. Save one with fetchkeep fetch <url>, then search again."
            : "Try a broader query, --all-versions, or fetchkeep list to browse saved documents.");
      }
      break;
    }
    case "list": {
      const documents = rows(data.documents);
      line(`${documents.length} shown / ${text(data.total)} saved  |  workspace ${text(data.workspace)}`, c.bold);
      for (const [i, item] of documents.entries()) {
        lines.push("");
        line(`${i + 1}. ${text(item.title) || "Untitled document"}`, c.bold);
        field("URL", item.url);
        line(`ref: fk:${text(item.docId)}@${text(item.latestVersion)}  |  ${text(item.versions)} versions`);
        field("Updated", item.updatedAt);
      }
      if (!documents.length) line(data.total === 0 ? "No saved documents. Start with fetchkeep fetch <url>." : "No documents at this offset. Try fetchkeep list --offset 0.");
      break;
    }
    case "versions": {
      field("Document", data.docId);
      const versions = rows(data.versions);
      for (const item of versions) {
        lines.push("");
        line(`v${text(item.version)}  |  ${text(item.backend)}  |  ${text(item.fetchedAt)}`, c.bold);
        line(`ref: fk:${text(data.docId)}@${text(item.version)}`);
        field("Last seen", item.lastSeenAt);
        field("Hash", item.contentHash);
      }
      if (!versions.length && !env.error) line("No versions found. Use fetchkeep list to choose a saved document.");
      break;
    }
    case "web_crawl": {
      field("Crawl", data.crawlId);
      field("URL", data.rootUrl);
      field("Stopped", data.stopReason);
      const counts = record(data.counts);
      if (Object.keys(counts).length) line(Object.entries(counts).map(([key, value]) => `${key}: ${text(value)}`).join("  |  "));
      for (const page of rows(data.pages)) {
        lines.push("");
        line(`${text(page.state).toUpperCase()}  depth ${text(page.depth)}  ${text(page.url)}`);
        field("ref", page.ref);
        field("Reason", page.reason);
      }
      if (data.resume) line(`Resume: fetchkeep crawl --resume ${text(data.crawlId)}`, c.cyan);
      break;
    }
    case "crawls": {
      const crawls = rows(data.crawls);
      for (const item of crawls) {
        lines.push("");
        line(`${text(item.id)}  |  ${text(item.status)}${item.stopReason ? ` (${text(item.stopReason)})` : ""}`, c.bold);
        field("URL", item.rootUrl);
        field("Updated", item.updatedAt);
        if (item.status === "stopped") line(`Resume: fetchkeep crawl --resume ${text(item.id)}`, c.cyan);
      }
      if (!crawls.length) line("No crawls yet. Start with fetchkeep crawl <url> --max-pages 10.");
      break;
    }
    case "doctor": {
      line(`fetchkeep ${text(data.version)}  |  ${text(data.platform)}`);
      for (const check of rows(data.checks)) {
        lines.push("");
        line(`${check.ok ? "OK" : "FAIL"}  ${text(check.name)}`, check.ok ? c.green : c.red);
        line(text(check.detail));
      }
      break;
    }
    case "delete":
      if (Array.isArray(data.deleted)) for (const id of data.deleted) field("Deleted", id);
      break;
    case "prune":
      field("Versions deleted", data.versionsDeleted);
      field("Snapshots deleted", data.snapshotsDeleted);
      break;
    case "web_read":
      if (Array.isArray(data.versions)) line(`Available versions: ${data.versions.map((v) => text(record(v).version)).join(", ")}`);
      for (const citation of rows(data.citations)) field("Block ref", citation.ref);
      for (const match of rows(data.matches)) {
        field("Matched block", match.blockId);
        field("Quote", match.quote);
      }
      break;
    default:
      // Structured extraction is inherently JSON; preserve the entire result, not a lossy summary.
      if (env.data !== undefined) lines.push(terminalText(JSON.stringify(env.data, null, 2)));
  }
  for (const warning of env.warnings) line(`Warning: ${warning}`, c.yellow);
  if (env.error) {
    line(`Error [${env.error.code}]: ${env.error.message}`, c.red);
    if (env.error.hint) line(`Try: ${env.error.hint}`, c.cyan);
    if (env.error.retryable) line("This error may be temporary; retry the command.");
  }
  return `${lines.join("\n")}\n`;
}

export function printEnvelope(env: Envelope, json: boolean | undefined, stdout: TerminalOutput = process.stdout, stderr: TerminalOutput = process.stderr): void {
  if (json) {
    stdout.write(`${JSON.stringify(env)}\n`);
    return;
  }
  stderr.write(renderHumanEnvelope(env, stderr));
  if (env.content?.text) stdout.write(`${stdout.isTTY ? terminalText(env.content.text) : env.content.text}\n`);
}
