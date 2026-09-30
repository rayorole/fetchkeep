import { defineConfig } from "vitest/config";

// Opt-in browser integration tests: `npm run test:browser`. Not part of `npm test` or CI.
export default defineConfig({
  test: {
    include: ["test/browser/**/*.browser.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
