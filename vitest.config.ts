import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "bench/test/**/*.test.ts"],
    exclude: ["test/**/*.browser.test.ts", "test/**/*.live.test.ts"],
    testTimeout: 30_000,
    globalSetup: ["test/setup/build.ts"],
  },
});
