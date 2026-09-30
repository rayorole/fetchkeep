import { afterEach, describe, expect, it, vi } from "vitest";
import type { Envelope } from "../src/core/schema.js";
import { printEnvelope, renderHumanEnvelope } from "../src/cli/presentation.js";

const hostile = "before\u001b[2J\u001b]0;forged title\u0007after\u0008\u009b31m";

function capture(isTTY: boolean) {
  const chunks: string[] = [];
  return { isTTY, columns: 36, write: (value: string) => chunks.push(value), chunks };
}

afterEach(() => vi.unstubAllEnvs());

describe("CLI presentation safety", () => {
  it("sanitizes terminal documents and diagnostic text without changing redirected Markdown", () => {
    vi.stubEnv("NO_COLOR", "1");
    const envelope: Envelope = {
      status: "partial",
      tool: "web_fetch",
      content: { format: "markdown", text: `# Document\n\n${hostile}` },
      timings: {},
      warnings: [`Partial response ${hostile}`],
      error: { code: "timeout", message: `Deadline ${hostile}`, retryable: true, hint: "Increase --timeout" },
    };
    const terminal = capture(true);
    const diagnostics = capture(true);
    printEnvelope(envelope, false, terminal, diagnostics);
    expect(terminal.chunks.join("")).toContain("# Document\n\nbeforeafter");
    expect(terminal.chunks.join("")).not.toMatch(/[\u001b\u0007\u0008\u009b]/);
    expect(diagnostics.chunks.join("")).not.toMatch(/[\u001b\u0007\u0008\u009b]/);
    expect(diagnostics.chunks.join("")).toContain("Partial response");
    expect(diagnostics.chunks.join("")).toContain("Deadline");
    expect(diagnostics.chunks.join("")).toContain("Increase --timeout");
    const redirected = capture(false);
    printEnvelope(envelope, false, redirected, capture(false));
    expect(redirected.chunks.join("")).toBe(`${envelope.content!.text}\n`);
  });

  it("does not emit ANSI to redirected output even when FORCE_COLOR is set", () => {
    vi.stubEnv("FORCE_COLOR", "3");
    const env: Envelope = {
      status: "success", tool: "web_search", timings: {}, warnings: [],
      data: { source: "local", query: "notes", results: [{ title: hostile, url: "https://example.com", snippet: hostile, ref: "fk:d_0123456789abcdef@1:b1" }] },
    };
    const stdout = capture(false);
    const stderr = capture(false);
    printEnvelope(env, false, stdout, stderr);
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join("")).not.toMatch(/[\u001b\u0007\u0008\u009b]/);
    expect(stderr.chunks.join("")).toContain("fk:d_0123456789abcdef@1:b1");
  });

  it("lets NO_COLOR override color forcing on a terminal", () => {
    vi.stubEnv("FORCE_COLOR", "3");
    vi.stubEnv("NO_COLOR", "");
    const output = renderHumanEnvelope({ status: "error", tool: "cli", timings: {}, warnings: [], error: { code: "not_found", message: "Missing document", retryable: false } }, capture(true));
    expect(output).not.toContain("\u001b");
    expect(output).toContain("not_found");
    expect(output).toContain("Missing document");
  });

  it("keeps full citation references and failure reasons at narrow widths", () => {
    vi.stubEnv("NO_COLOR", "1");
    const ref = "fk:d_0123456789abcdef@123:b17";
    const output = renderHumanEnvelope({
      status: "partial", tool: "web_crawl", timings: {}, warnings: [],
      data: {
        crawlId: "c_0123456789ab", stopReason: "deadline", counts: { failed: 1, done: 1 },
        pages: [{ state: "done", depth: 1, url: "https://example.com/docs", ref }, { state: "failed", depth: 1, url: "https://example.com/slow", reason: "request timed out" }],
        resume: { crawlId: "c_0123456789ab" },
      },
    }, capture(true));
    expect(output).toContain(ref);
    expect(output).toContain("request timed out");
    expect(output.replace(/\s+/g, " ")).toContain("fetchkeep crawl --resume c_0123456789ab");
  });
});
