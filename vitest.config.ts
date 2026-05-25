import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Force single module instance for cross-package types — fixes
    // instanceof failures when ratelimit/auth throw a spine-errors
    // exception that the test imports from the alias.
    dedupe: [
      "@021is/spine-errors",
      "@021is/spine-env",
      "@021is/spine-testing",
      "@021is/spine-http",
      "@021is/spine-auth",
      "@021is/spine-telemetry",
      "@021is/spine-actions",
      "@021is/spine-ratelimit",
      "@021is/spine-webhooks",
      "@021is/spine-email",
      "@021is/spine-cache",
      "@021is/spine-jobs",
      "@021is/spine-i18n",
      "@021is/spine-query",
    ],
    // Order matters: more specific subpath aliases BEFORE the bare-package alias.
    alias: [
      { find: "@021is/spine-errors/next", replacement: resolve(__dirname, "packages/errors/src/next.ts") },
      { find: "@021is/spine-errors", replacement: resolve(__dirname, "packages/errors/src/index.ts") },
      { find: "@021is/spine-env", replacement: resolve(__dirname, "packages/env/src/index.ts") },
      { find: "@021is/spine-testing/postgres", replacement: resolve(__dirname, "packages/testing/src/postgres.ts") },
      { find: "@021is/spine-testing/jwks", replacement: resolve(__dirname, "packages/testing/src/jwks.ts") },
      { find: "@021is/spine-testing/msw", replacement: resolve(__dirname, "packages/testing/src/msw.ts") },
      { find: "@021is/spine-testing/time", replacement: resolve(__dirname, "packages/testing/src/time.ts") },
      { find: "@021is/spine-testing", replacement: resolve(__dirname, "packages/testing/src/index.ts") },
      { find: "@021is/spine-http", replacement: resolve(__dirname, "packages/http/src/index.ts") },
      { find: "@021is/spine-auth/next", replacement: resolve(__dirname, "packages/auth/src/next.ts") },
      { find: "@021is/spine-auth", replacement: resolve(__dirname, "packages/auth/src/index.ts") },
      { find: "@021is/spine-telemetry", replacement: resolve(__dirname, "packages/telemetry/src/index.ts") },
      { find: "@021is/spine-actions", replacement: resolve(__dirname, "packages/actions/src/index.ts") },
      { find: "@021is/spine-ratelimit", replacement: resolve(__dirname, "packages/ratelimit/src/index.ts") },
      { find: "@021is/spine-webhooks", replacement: resolve(__dirname, "packages/webhooks/src/index.ts") },
      { find: "@021is/spine-email", replacement: resolve(__dirname, "packages/email/src/index.ts") },
      { find: "@021is/spine-cache", replacement: resolve(__dirname, "packages/cache/src/index.ts") },
      { find: "@021is/spine-i18n/react", replacement: resolve(__dirname, "packages/i18n/src/react.tsx") },
      { find: "@021is/spine-i18n/server", replacement: resolve(__dirname, "packages/i18n/src/server.ts") },
      { find: "@021is/spine-i18n", replacement: resolve(__dirname, "packages/i18n/src/index.ts") },
      { find: "@021is/spine-jobs", replacement: resolve(__dirname, "packages/jobs/src/index.ts") },
      { find: "@021is/spine-query", replacement: resolve(__dirname, "packages/query/src/index.ts") },
    ],
  },
  test: {
    globals: false,
    environment: "node",
    pool: "threads",
    poolOptions: { threads: { singleThread: false } },
    server: {
      deps: {
        // Force bundling of workspace packages so aliases win over symlinks
        // — otherwise instanceof fails across the alias/symlink boundary.
        inline: [/@021is\/spine-/],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      exclude: ["**/dist/**", "**/node_modules/**", "**/tests/**", "**/*.test.ts", "**/*.config.ts"],
    },
    include: ["packages/*/tests/**/*.test.ts", "packages/*/src/**/*.test.ts"],
  },
});
