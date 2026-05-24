import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Order matters: more specific subpath aliases BEFORE the bare-package alias.
    alias: [
      { find: "@021/spine-errors/next", replacement: resolve(__dirname, "packages/errors/src/next.ts") },
      { find: "@021/spine-errors", replacement: resolve(__dirname, "packages/errors/src/index.ts") },
      { find: "@021/spine-env", replacement: resolve(__dirname, "packages/env/src/index.ts") },
      { find: "@021/spine-testing/postgres", replacement: resolve(__dirname, "packages/testing/src/postgres.ts") },
      { find: "@021/spine-testing/jwks", replacement: resolve(__dirname, "packages/testing/src/jwks.ts") },
      { find: "@021/spine-testing/msw", replacement: resolve(__dirname, "packages/testing/src/msw.ts") },
      { find: "@021/spine-testing/time", replacement: resolve(__dirname, "packages/testing/src/time.ts") },
      { find: "@021/spine-testing", replacement: resolve(__dirname, "packages/testing/src/index.ts") },
      { find: "@021/spine-http", replacement: resolve(__dirname, "packages/http/src/index.ts") },
      { find: "@021/spine-auth/next", replacement: resolve(__dirname, "packages/auth/src/next.ts") },
      { find: "@021/spine-auth", replacement: resolve(__dirname, "packages/auth/src/index.ts") },
      { find: "@021/spine-telemetry", replacement: resolve(__dirname, "packages/telemetry/src/index.ts") },
      { find: "@021/spine-actions", replacement: resolve(__dirname, "packages/actions/src/index.ts") },
    ],
  },
  test: {
    globals: false,
    environment: "node",
    pool: "threads",
    poolOptions: { threads: { singleThread: false } },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      exclude: ["**/dist/**", "**/node_modules/**", "**/tests/**", "**/*.test.ts", "**/*.config.ts"],
    },
    include: ["packages/*/tests/**/*.test.ts", "packages/*/src/**/*.test.ts"],
  },
});
