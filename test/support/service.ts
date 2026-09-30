import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, type ConfigOverrides } from "../../src/core/config.js";
import { Fetchkeep } from "../../src/core/service.js";

export function tempHome(): { home: string; cleanup: () => void } {
  const home = mkdtempSync(join(tmpdir(), "fetchkeep-test-"));
  return { home, cleanup: () => rmSync(home, { recursive: true, force: true }) };
}

/** A service whose store lives in `home` and which may contact `localhost` test servers only. */
export function testService(home: string, overrides: ConfigOverrides = {}): Fetchkeep {
  const config = loadConfig({
    env: {},
    overrides: { home, network: { allowHosts: ["localhost"] }, ...overrides },
  });
  return new Fetchkeep(config);
}
