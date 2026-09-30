import { expect, it } from "vitest";
import { citationVerified, type CitationMatch, type CitationRead } from "../lib/citation.ts";

const quote = "reads tidewater.toml from the project root";
const match: CitationMatch = { quote, offset: 10, blockId: "b2", citation: { ref: "fk:d_one@1#b2", version: 1, contentHash: "document-hash", blockId: "b2", blockHash: "block-hash" } };
const reopened: CitationRead = { status: "success", document: { ref: "fk:d_one@1", version: 1, contentHash: "document-hash" }, content: { blocks: [{ id: "b2", hash: "block-hash", text: `Tidewater ${quote} before starting.` }] } };

it("verifies persisted source text instead of Markdown backticks for inline code", () => {
  expect(citationVerified(match, reopened, quote)).toBe(true);
  expect(citationVerified(match, reopened, "READS  tidewater.toml from the project root")).toBe(true);
  expect(citationVerified(match, reopened, "reads tidewater.toml from some other root")).toBe(false);
});

it("rejects stale identities and wrong source spans, even if text occurs elsewhere", () => {
  expect(citationVerified({ ...match, offset: 0 }, reopened, quote)).toBe(false);
  expect(citationVerified(match, { ...reopened, document: { ref: "fk:d_one@2", version: 2, contentHash: "document-hash" } }, quote)).toBe(false);
  expect(citationVerified(match, { ...reopened, document: { ref: "fk:d_one@1", version: 1, contentHash: "different" } }, quote)).toBe(false);
  expect(citationVerified(match, { ...reopened, document: { ref: "fk:d_other@1", version: 1, contentHash: "document-hash" } }, quote)).toBe(false);
  expect(citationVerified({ ...match, citation: { ...match.citation, blockHash: "different" } }, reopened, quote)).toBe(false);
  expect(citationVerified(match, { ...reopened, content: {} }, quote)).toBe(false);
});
