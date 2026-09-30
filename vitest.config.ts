import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/**/*.browser.test.ts", "test/**/*.live.test.ts"],
    testTimeout: 30_000,
  },
});
