import { expect, it } from "vitest";
import type { BrowserName } from "../../src/browser/provider.js";
import type { Fetchkeep } from "../../src/core/service.js";

export function readinessCases(service: () => Fetchkeep, url: (path: string) => string, mode: BrowserName): void {
  it("waits for delayed loading content without network activity", async () => {
    const env = await service().fetch({ url: url("/readiness/delayed"), mode, includeBlocks: true });
    expect(env.status, JSON.stringify(env.error)).toBe("success");
    expect(env.content!.text).toContain("# Delayed reference");
    expect(env.content!.text).toContain("const delayedAnswer = 42;");
    expect(env.content!.text).not.toContain("Loading reference");
  });

  it("waits for the original ten-second timer case instead of treating navigation and footer as content", async () => {
    const env = await service().fetch({ url: url("/readiness/long-delayed"), mode, timeoutMs: 20_000 });
    expect(env.status, JSON.stringify(env.error)).toBe("success");
    expect(env.content!.text).toContain("# Late observations");
    expect(env.content!.text).toContain("seventeen nesting pairs after asynchronous initialization");
  });

  it("returns a legitimate short static document within a short deadline", async () => {
    const env = await service().fetch({ url: url("/readiness/short-static"), mode, timeoutMs: 1500 });
    expect(env.status, JSON.stringify(env.error)).toBe("success");
    expect(env.content!.text).toContain("Closed on Tuesday.");
  });

  it("bounds permanent loading by the consumer deadline and recovers on the next request", async () => {
    const started = performance.now();
    const env = await service().fetch({ url: url("/readiness/never-ready"), mode, timeoutMs: 1500 });
    expect(performance.now() - started).toBeLessThan(4000);
    if (env.status === "error") expect(env.error?.code).toBe("timeout");
    else expect(env.content!.text).toContain("Loading reference");
    expect((await service().fetch({ url: url("/readiness/short-static"), mode })).content!.text).toContain("Closed on Tuesday.");
  });

  it("honors the explicit settle window even when initial content is already meaningful", async () => {
    const env = await service().fetch({ url: url("/readiness/settle"), mode });
    expect(env.status, JSON.stringify(env.error)).toBe("success");
    expect(env.content!.text).toContain("The explicit settle window includes this updated reference version.");
    expect(env.content!.text).not.toContain("The initial reference");
  });

  it("preserves nested shadow code, assigned slots and fallback content without duplicates", async () => {
    const env = await service().fetch({ url: url("/readiness/shadow"), mode, includeBlocks: true });
    expect(env.status, JSON.stringify(env.error)).toBe("success");
    const text = env.content!.text;
    for (const code of ["const slottedAnswer = 43;", "const shadowAnswer = 44;", "const fallbackAnswer = 45;"]) {
      expect(text).toContain(`\`\`\`\n${code}\n\`\`\``);
      expect(text.indexOf(code)).toBe(text.lastIndexOf(code));
    }
    expect(text).not.toContain("UNASSIGNED LIGHT DOM");
    expect(text).not.toContain("UNUSED FALLBACK");
  });

  it("returns useful content within the deadline despite a persistent background request", async () => {
    const env = await service().fetch({ url: url("/readiness/background"), mode, timeoutMs: 1500 });
    expect(env.status, JSON.stringify(env.error)).toBe("success");
    expect(env.content!.text).toContain("The useful reference content is already ready");
  });
}
