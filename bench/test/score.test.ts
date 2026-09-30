import { describe, expect, it } from "vitest";
import { codePreserved, headingTexts, plain, scoreFetch, tableRowPreserved, tokenPRF } from "../lib/score.ts";
import type { FetchCase } from "../lib/types.ts";

describe("plain", () => {
  it("removes markup and link targets so engines are compared on text, not syntax", () => {
    expect(plain("**Bold** [link](https://x.test/a) `code` \\_x\\_ &amp; ![alt](i.png)")).toBe("bold link code x & alt");
  });
});

describe("headingTexts", () => {
  it("accepts ATX and setext headings but not list items", () => {
    expect(headingTexts("# One\n\nTwo\n===\n\nThree\n---\n\n- item\n---")).toEqual(["one", "two", "three"]);
  });
});

describe("tableRowPreserved", () => {
  it("requires all cells on one table line, in order", () => {
    const md = "| A | B \\| x | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |";
    expect(tableRowPreserved(md, ["A", "B | x", "C"])).toBe(true);
    expect(tableRowPreserved(md, ["1", "3"])).toBe(true);
    expect(tableRowPreserved(md, ["3", "1"])).toBe(false);
    expect(tableRowPreserved("A B C\n1 2 3", ["1", "2", "3"])).toBe(false);
  });
});

describe("codePreserved", () => {
  const code = "if (a) {\n  b();\n}";
  it("accepts fenced or indented blocks with a constant indentation prefix", () => {
    expect(codePreserved("text\n\n```js\nif (a) {\n  b();\n}\n```", code)).toBe(true);
    expect(codePreserved("1. step\n\n   ```\n   if (a) {\n     b();\n   }\n   ```", code)).toBe(true);
    expect(codePreserved("    if (a) {\n      b();\n    }", code)).toBe(true);
  });
  it("rejects code that lost its block, its indentation or its characters", () => {
    expect(codePreserved("if (a) {\n  b();\n}", code)).toBe(false);
    expect(codePreserved("```\nif (a) {\nb();\n}\n```", code)).toBe(false);
    expect(codePreserved("```\nif (a) \\{\n  b();\n}\n```", code)).toBe(false);
  });
});

describe("tokenPRF", () => {
  it("is a multiset overlap", () => {
    expect(tokenPRF("a a b", "a b")).toEqual({ precision: 2 / 3, recall: 1, f1: 0.8 });
    expect(tokenPRF("", "a").f1).toBe(0);
  });
});

describe("scoreFetch", () => {
  const c: FetchCase = {
    id: "t",
    kind: "fetch",
    dataset: "fixture",
    url: "/t",
    category: "article",
    description: "",
    mustContain: ["alpha beta gamma", "delta epsilon", "zeta eta", "theta iota"],
    mustNotContain: ["cookie banner"],
    headings: ["Title"],
  };
  it("counts a result usable at >= 75% passage recall", () => {
    const md = "# Title\n\nAlpha *beta* gamma. Delta epsilon. Zeta eta.";
    const s = scoreFetch(c, true, md, null);
    expect(s).toMatchObject({ passageRecall: 0.75, usable: 1, boilerplateExclusion: 1, headings: 1 });
    expect(scoreFetch(c, true, "# Title\n\nAlpha beta gamma. cookie banner", null)).toMatchObject({ usable: 0, boilerplateExclusion: 0 });
  });
  it("scores failures as zero and expected errors by whether an error was reported", () => {
    expect(scoreFetch(c, false, "whatever", null)).toMatchObject({ passageRecall: 0, usable: 0 });
    const errCase = { ...c, expectError: true };
    expect(scoreFetch(errCase, false, "", null).correctError).toBe(1);
    expect(scoreFetch(errCase, true, "page", null).correctError).toBe(0);
  });
});
