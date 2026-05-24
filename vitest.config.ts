import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      exclude: [
        "**/dist/**",
        "**/node_modules/**",
        "**/tests/**",
        "**/*.test.ts",
        "**/*.config.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    include: ["packages/*/tests/**/*.test.ts", "packages/*/src/**/*.test.ts"],
  },
});
