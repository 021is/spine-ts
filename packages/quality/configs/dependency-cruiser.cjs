// Spine hexagonal layer enforcement.
// See spine-ts/STRUCTURE.md import-rules table.
// Apps drop this in as `.dependency-cruiser.cjs` (or extend it):
//
//   module.exports = require("@021.is/spine-quality/dependency-cruiser");
//

/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies block tree-shaking and signal tangled responsibilities.",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-cannot-import-adapters-or-framework",
      severity: "error",
      comment:
        "Domain layer is pure — no imports of adapters, framework (next, react), database (prisma, pg), or HTTP (fetch wrappers).",
      from: { path: "^src/feature/[^/]+/domain/" },
      to: {
        path: [
          "^src/feature/[^/]+/adapters/",
          "^src/feature/[^/]+/ports/",
          "^src/lib/",
          "^src/components/",
          "^src/app/",
        ],
        pathNot: ["^src/feature/[^/]+/domain/"],
      },
    },
    {
      name: "domain-cannot-import-external-side-effect-deps",
      severity: "error",
      comment: "Domain code MUST be pure — no Prisma / pg / next / fetch wrappers.",
      from: { path: "^src/feature/[^/]+/domain/" },
      to: {
        path: [
          "node_modules/@prisma/client",
          "node_modules/prisma",
          "node_modules/pg",
          "node_modules/next",
          "node_modules/react",
          "node_modules/react-dom",
        ],
      },
    },
    {
      name: "ports-cannot-import-adapters",
      severity: "error",
      comment: "A port is an interface — it never references its own implementations.",
      from: { path: "^src/feature/[^/]+/ports/" },
      to: { path: "^src/feature/[^/]+/adapters/" },
    },
    {
      name: "usecase-cannot-import-adapters-or-framework",
      severity: "error",
      comment:
        "Use cases orchestrate ports. They never know which adapter is wired — that's the boundary the test relies on.",
      from: { path: "^src/feature/[^/]+/usecase/" },
      to: {
        path: ["^src/feature/[^/]+/adapters/", "^src/app/", "node_modules/next"],
      },
    },
    {
      name: "routes-cannot-import-domain-or-adapters-directly",
      severity: "error",
      comment:
        "Next routes are skinny — call use cases via the feature's index.ts, never reach into domain/adapters.",
      from: { path: "^src/app/" },
      to: {
        path: [
          "^src/feature/[^/]+/domain/",
          "^src/feature/[^/]+/adapters/",
          "^src/feature/[^/]+/ports/",
        ],
      },
    },
    {
      name: "cross-feature-via-index-only",
      severity: "error",
      comment:
        "Cross-feature imports go through each feature's index.ts (public surface) — never reach into a sibling's usecase/ or domain/ directly.",
      from: { path: "^src/feature/([^/]+)/" },
      to: {
        path: "^src/feature/(?!\\1)([^/]+)/(domain|ports|adapters|usecase|schema|components|hooks)/",
      },
    },
    {
      name: "no-deprecated-node-builtins",
      severity: "error",
      comment: "Deprecated Node APIs.",
      from: {},
      to: { dependencyTypes: ["deprecated"] },
    },
    {
      name: "not-to-test",
      severity: "error",
      comment: "Source must not import from tests/.",
      from: { pathNot: "(\\.test\\.[jt]sx?$|tests/)" },
      to: { path: "(\\.test\\.[jt]sx?$|tests/)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "default"] },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
