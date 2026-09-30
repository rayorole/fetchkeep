import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findPackageVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { name?: string; version?: string };
      if (pkg.name === "fetchkeep" && pkg.version) return pkg.version;
    } catch {
      // keep walking up
    }
    dir = dirname(dir);
  }
  return "0.0.0";
}

/** Fetchkeep package version (from package.json). */
export const VERSION = findPackageVersion();

/** Version of the extraction pipeline. Bump whenever extraction output for the same input can change. */
export const EXTRACTOR_VERSION = "fk-extract/1";

export const USER_AGENT = `Fetchkeep/${VERSION} (+https://github.com/rayorole/fetchkeep)`;
