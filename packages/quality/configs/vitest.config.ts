import { defineConfig } from "vitest/config";

/**
 * Canonical vitest config for every Spine consumer. Apps extend like:
 *
 *   // vitest.config.ts
 *   import { mergeConfig } from "vitest/config";
 *   import spineDefaults from "@021.is/spine-quality/vitest";
 *   import { resolve } from "node:path";
 *
 *   export default mergeConfig(spineDefaults, {
 *     resolve: { alias: { "@": resolve(__dirname, "src") } },
 *     test: { setupFiles: ["./tests/setup.ts"] },
 *   });
 */
export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    pool: "threads",
    poolOptions: { threads: { singleThread: false } },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      exclude: [
        "**/dist/**",
        "**/node_modules/**",
        "**/tests/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.config.ts",
        "**/*.d.ts",
      ],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
    },
  },
});
