/**
 * @021is/spine-quality
 *
 * Shipping configs for the Spine quality gate. Apps consume via the
 * package.json exports map:
 *
 *   // biome.json
 *   { "extends": "@021is/spine-quality/biome" }
 *
 *   // tsconfig.json
 *   { "extends": "@021is/spine-quality/tsconfig-next" }
 *
 *   // knip.json
 *   { "extends": "@021is/spine-quality/knip" }
 *
 *   // .dependency-cruiser.cjs
 *   module.exports = require("@021is/spine-quality/dependency-cruiser");
 *
 *   // semgrep
 *   semgrep --config "$(node -p "require.resolve('@021is/spine-quality/semgrep')")"
 *
 *   // size-limit.json
 *   { "extends": "@021is/spine-quality/size-limit" }
 *
 * Vitest config + Lighthouse-CI assertions are app-local (different
 * apps have different routes), but spine-ts/STRUCTURE.md publishes the
 * canonical patterns.
 */

/**
 * The full doctrine summary — every check the spine-quality-gate runs.
 * Exported so `spine doctor --strict` can render it.
 */
export interface QualityCheck {
  id: string;
  category:
    | "lint"
    | "type"
    | "dead-code"
    | "deps"
    | "security"
    | "tests"
    | "perf"
    | "size"
    | "arch";
  description: string;
  tool: string;
  blocking: boolean;
}

export const QUALITY_CHECKS: readonly QualityCheck[] = [
  {
    id: "biome.lint",
    category: "lint",
    description: "Biome lint (no any, no console, no unused imports, etc.)",
    tool: "biome check",
    blocking: true,
  },
  {
    id: "biome.format",
    category: "lint",
    description: "Biome formatting",
    tool: "biome check",
    blocking: true,
  },
  {
    id: "tsc.strict",
    category: "type",
    description: "tsc --strict --noEmit",
    tool: "tsc",
    blocking: true,
  },
  {
    id: "type.coverage",
    category: "type",
    description: "Type coverage ≥ 99%",
    tool: "type-coverage",
    blocking: true,
  },
  {
    id: "knip",
    category: "dead-code",
    description: "Dead exports + dead deps",
    tool: "knip",
    blocking: true,
  },
  {
    id: "madge",
    category: "dead-code",
    description: "No circular deps",
    tool: "madge --circular",
    blocking: true,
  },
  {
    id: "depcruise",
    category: "arch",
    description: "Hexagonal layer rules (domain can't import adapters, etc.)",
    tool: "depcruise --validate",
    blocking: true,
  },
  {
    id: "semgrep.owasp",
    category: "security",
    description: "OWASP top-10 + Spine custom rules",
    tool: "semgrep",
    blocking: true,
  },
  {
    id: "spine-lint",
    category: "arch",
    description: "Spine custom AST checks (ResponseDto, enum-over-string, OpenAPI, i18n parity)",
    tool: "spine-lint",
    blocking: true,
  },
  {
    id: "npm.audit",
    category: "security",
    description: "npm audit (high+critical)",
    tool: "npm audit",
    blocking: true,
  },
  {
    id: "vitest",
    category: "tests",
    description: "All tests pass",
    tool: "vitest",
    blocking: true,
  },
  {
    id: "vitest.coverage",
    category: "tests",
    description: "Coverage ≥ 70% lines / 60% branches",
    tool: "vitest",
    blocking: true,
  },
  {
    id: "size-limit",
    category: "size",
    description: "Bundle size budget (200 KB gzipped per route)",
    tool: "size-limit",
    blocking: true,
  },
] as const;
