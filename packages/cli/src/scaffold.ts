import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Scaffold a fresh Next.js app following the package skeleton (see STRUCTURE.md).
 *
 * Creates:
 *   - root files: package.json, tsconfig.json, biome.json, AGENTS.md, CLAUDE.md, README.md, .gitignore
 *   - vitest.config.ts, playwright.config.ts (stub), prisma/schema.prisma (stub)
 *   - directory tree: src/{app,feature,components/ui,lib,hooks,config,data,types,i18n}
 *   - tests/{setup.ts, factories, e2e}
 *   - One example feature: src/feature/example/{domain,ports,adapters,usecase,components,schema,index.ts}
 *
 * Doesn't run `bun install` — the caller does, so we don't surprise people.
 */
export interface ScaffoldNextAppInput {
  /** Where to create. Must NOT already contain package.json. */
  cwd: string;
  /** Name in package.json. Default: basename(cwd). */
  name?: string;
  /** Designed for this org. */
  org?: string;
}

export function scaffoldNextApp(input: ScaffoldNextAppInput): {
  created: string[];
  skipped: string[];
} {
  const root = input.cwd;
  const created: string[] = [];
  const skipped: string[] = [];
  const name = input.name ?? root.split("/").filter(Boolean).pop() ?? "my-app";
  const org = input.org ?? "021is";

  const dirs = [
    "src/app/(public)",
    "src/app/(account)",
    "src/app/api",
    "src/feature/example/domain",
    "src/feature/example/ports",
    "src/feature/example/adapters/prisma",
    "src/feature/example/adapters/memory",
    "src/feature/example/usecase/tests",
    "src/feature/example/schema/tests",
    "src/feature/example/components",
    "src/feature/example/hooks",
    "src/components/ui",
    "src/lib",
    "src/hooks",
    "src/config",
    "src/data",
    "src/types",
    "src/i18n",
    "tests/factories",
    "tests/e2e",
    "prisma/migrations",
    "scripts",
  ];
  for (const d of dirs) mkdirSync(join(root, d), { recursive: true });

  const files: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        name: `@${org}/${name}`,
        version: "0.0.0",
        private: true,
        type: "module",
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "biome check .",
          test: "vitest run --reporter=verbose --reporter=github-actions",
          "test:watch": "vitest",
          "test:e2e": "playwright test",
          typecheck: "tsc --noEmit",
        },
        dependencies: {
          next: "^16.0.0",
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          "@prisma/client": "^5.20.0",
          zod: "^3.23.8",
          "@021.is/spine-errors": "^0.1.0",
          "@021.is/spine-env": "^0.1.0",
          "@021.is/spine-auth": "^0.1.0",
          "@021.is/spine-i18n": "^0.1.0",
          "@021.is/spine-actions": "^0.1.0",
          "@021.is/spine-query": "^0.1.0",
          "@tanstack/react-query": "^5.0.0",
        },
        devDependencies: {
          "@biomejs/biome": "1.9.4",
          "@types/node": "^22.0.0",
          "@types/react": "^19.0.0",
          "@vitest/coverage-v8": "^2.1.0",
          "@021.is/spine-testing": "^0.1.0",
          prisma: "^5.20.0",
          typescript: "^5.6.0",
          vitest: "^2.1.0",
          playwright: "^1.48.0",
        },
        engines: { bun: ">=1.2" },
      },
      null,
      2,
    ),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          strict: true,
          noUncheckedIndexedAccess: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          isolatedModules: true,
          resolveJsonModule: true,
          jsx: "preserve",
          incremental: true,
          baseUrl: ".",
          paths: { "@/*": ["./src/*"] },
          plugins: [{ name: "next" }],
        },
        include: ["next-env.d.ts", "src/**/*", "tests/**/*"],
        exclude: ["node_modules", ".next"],
      },
      null,
      2,
    ),
    "biome.json": JSON.stringify(
      {
        $schema: "https://biomejs.dev/schemas/1.9.4/schema.json",
        files: { ignore: [".next/**", "node_modules/**"] },
        formatter: { enabled: true, indentStyle: "space", indentWidth: 2, lineWidth: 100 },
        javascript: {
          formatter: { quoteStyle: "double", semicolons: "always", trailingCommas: "all" },
        },
        linter: {
          enabled: true,
          rules: {
            recommended: true,
            suspicious: { noExplicitAny: "error" },
            style: { useImportType: "error" },
          },
        },
      },
      null,
      2,
    ),
    ".gitignore": [
      "node_modules/",
      ".next/",
      "dist/",
      "coverage/",
      "*.tsbuildinfo",
      ".env",
      ".env.local",
      "tests/e2e/.cache/",
      "playwright-report/",
      "test-results/",
    ].join("\n"),
    "AGENTS.md": agentsTemplate(name),
    "CLAUDE.md": "@AGENTS.md\n",
    "README.md": `# ${name}\n\nBootstrapped from \`spine new\`. Follow [STRUCTURE.md](https://github.com/021is/spine-ts/blob/main/STRUCTURE.md).\n`,
    "vitest.config.ts": vitestConfig(),
    "playwright.config.ts": playwrightConfig(),
    "tests/setup.ts": testsSetup(),
    "prisma/schema.prisma": prismaStub(),
    "src/lib/env.ts": envStub(),
    "src/feature/example/index.ts": `export { exampleUseCase } from "./usecase/example.js";\n`,
    "src/feature/example/usecase/example.ts": exampleUsecase(),
    "src/feature/example/usecase/tests/example.test.ts": exampleUsecaseTest(),
    "src/feature/example/domain/Example.ts": exampleDomain(),
    "src/feature/example/ports/ExampleRepo.ts": exampleRepoPort(),
    "src/feature/example/adapters/memory/InMemoryExampleRepo.ts": memoryRepo(),
    "src/feature/example/schema/example.ts": exampleSchema(),
  };

  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    if (existsSync(full)) {
      skipped.push(path);
      continue;
    }
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
    created.push(path);
  }

  return { created, skipped };
}

function agentsTemplate(name: string): string {
  return `# AGENTS.md — ${name}

## Stack

- Next.js (App Router) + React 19 + TypeScript strict
- Prisma + Postgres (via managed Postgres in prod; Testcontainers in tests)
- Vitest + Playwright + MSW
- Spine-TS packages: errors, env, auth, i18n, actions, query, testing

## Hard rules

- **ResponseDto from every endpoint + server action.** Wrap with \`withErrorHandling\` (route) or \`tryAction\` / \`defineAction\` (server action).
- **Hexagonal per feature.** \`src/feature/<f>/{domain,ports,adapters,usecase,schema,components}\`. Domain knows nothing about Prisma/Next.
- **Tests use real DB via @021.is/spine-testing.** No mocks for our own domain.
- **No raw \`<button>\` / \`<input>\`** — always shadcn primitives (or the project's chosen design system).
- **No push to main** — PR-only. Branch protection enforces it. If staging exists: \`preview/*\` branches.

## See

- \`STRUCTURE.md\` (this repo) — full folder doctrine
- \`https://github.com/021is/spine-ts/blob/main/STRUCTURE.md\` — Spine canonical structure
`;
}

function vitestConfig(): string {
  return `import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: {
    environment: "node",
    pool: "threads",
    setupFiles: ["./tests/setup.ts"],
    coverage: { provider: "v8", thresholds: { lines: 70, branches: 60 } },
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "**/node_modules/**", "**/.next/**"],
  },
});
`;
}

function playwrightConfig(): string {
  return `import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
  webServer: { command: "bun run start", port: 3000, reuseExistingServer: !process.env.CI },
});
`;
}

function testsSetup(): string {
  return `import { afterAll, afterEach, beforeAll } from "vitest";
import { runPrismaMigrate, startSharedPostgres, truncateAll } from "@021.is/spine-testing/postgres";
import { startMockServer } from "@021.is/spine-testing/msw";

let dbUrl: string;
const mocks = startMockServer();

beforeAll(async () => {
  dbUrl = await startSharedPostgres();
  process.env.DATABASE_URL = dbUrl;
  await runPrismaMigrate(dbUrl, { mode: "push" });
}, 60_000);

afterEach(async () => {
  await truncateAll(dbUrl);
  mocks.reset();
});

afterAll(() => mocks.stop());
`;
}

function prismaStub(): string {
  return `generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model Example {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}
`;
}

function envStub(): string {
  return `import { common, defineEnv } from "@021.is/spine-env";
export const env = defineEnv({
  schema: {
    NODE_ENV: common.nodeEnv(),
    DATABASE_URL: common.pgUrl(),
  },
});
`;
}

function exampleUsecase(): string {
  return `import { BadRequestException } from "@021.is/spine-errors";
import type { ExampleRepo } from "../ports/ExampleRepo.js";
import type { Example } from "../domain/Example.js";

export async function exampleUseCase(
  input: { name: string },
  ports: { repo: ExampleRepo },
): Promise<Example> {
  if (input.name.length < 2) throw new BadRequestException("name too short");
  const created = await ports.repo.create({ name: input.name });
  return created;
}
`;
}

function exampleUsecaseTest(): string {
  return `import { describe, expect, it } from "vitest";
import { BadRequestException } from "@021.is/spine-errors";
import { makeInMemoryExampleRepo } from "../../adapters/memory/InMemoryExampleRepo.js";
import { exampleUseCase } from "../example.js";

describe("exampleUseCase", () => {
  it("creates with valid name", async () => {
    const repo = makeInMemoryExampleRepo();
    const out = await exampleUseCase({ name: "hello" }, { repo });
    expect(out.name).toBe("hello");
  });
  it("rejects short name with BadRequest", async () => {
    const repo = makeInMemoryExampleRepo();
    await expect(exampleUseCase({ name: "x" }, { repo })).rejects.toThrow(BadRequestException);
  });
});
`;
}

function exampleDomain(): string {
  return `export interface Example {
  id: string;
  name: string;
  createdAt: Date;
}
`;
}

function exampleRepoPort(): string {
  return `import type { Example } from "../domain/Example.js";
export interface ExampleRepo {
  create(input: { name: string }): Promise<Example>;
  findById(id: string): Promise<Example | null>;
}
`;
}

function memoryRepo(): string {
  return `import type { Example } from "../../domain/Example.js";
import type { ExampleRepo } from "../../ports/ExampleRepo.js";

export function makeInMemoryExampleRepo(): ExampleRepo {
  const store = new Map<string, Example>();
  let n = 0;
  return {
    async create({ name }) {
      const id = \`ex_\${++n}\`;
      const e: Example = { id, name, createdAt: new Date() };
      store.set(id, e);
      return e;
    },
    async findById(id) {
      return store.get(id) ?? null;
    },
  };
}
`;
}

function exampleSchema(): string {
  return `import { z } from "zod";
export const exampleInput = z.object({ name: z.string().min(2).max(80) });
export type ExampleInput = z.infer<typeof exampleInput>;
`;
}
