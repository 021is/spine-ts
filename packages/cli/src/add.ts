import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `spine add <package-or-feature>` — wire a Spine package into an
 * existing repo OR scaffold a feature folder skeleton.
 *
 * Supported targets:
 *   testing | auth | i18n | actions | query | ratelimit | webhooks |
 *   email | cache | jobs | telemetry | feature:<name>
 */
export const ADD_TARGETS = {
  TESTING: "testing",
  AUTH: "auth",
  I18N: "i18n",
  ACTIONS: "actions",
  QUERY: "query",
  RATELIMIT: "ratelimit",
  WEBHOOKS: "webhooks",
  EMAIL: "email",
  CACHE: "cache",
  JOBS: "jobs",
  TELEMETRY: "telemetry",
} as const;
export type AddTarget = (typeof ADD_TARGETS)[keyof typeof ADD_TARGETS];

const PACKAGE_DEPS: Record<AddTarget, { dev: boolean; deps: string[]; peerDeps?: string[] }> = {
  testing: { dev: true, deps: ["@021is/spine-testing", "vitest", "@vitest/coverage-v8"] },
  auth: { dev: false, deps: ["@021is/spine-auth", "@021is/spine-errors"] },
  i18n: { dev: false, deps: ["@021is/spine-i18n"] },
  actions: { dev: false, deps: ["@021is/spine-actions", "@021is/spine-errors", "zod"] },
  query: { dev: false, deps: ["@021is/spine-query", "@tanstack/react-query"] },
  ratelimit: { dev: false, deps: ["@021is/spine-ratelimit", "@021is/spine-errors"] },
  webhooks: { dev: false, deps: ["@021is/spine-webhooks", "@021is/spine-errors"] },
  email: { dev: false, deps: ["@021is/spine-email", "@021is/spine-errors"] },
  cache: { dev: false, deps: ["@021is/spine-cache"] },
  jobs: { dev: false, deps: ["@021is/spine-jobs"] },
  telemetry: { dev: false, deps: ["@021is/spine-telemetry"] },
};

export interface AddResult {
  installed: string[];
  filesCreated: string[];
  notes: string[];
}

export function planAdd(cwd: string, target: string): AddResult & { commands: string[] } {
  if (!existsSync(join(cwd, "package.json"))) {
    throw new Error("no package.json at cwd — run spine add from a repo root");
  }
  if (target.startsWith("feature:")) {
    return planAddFeature(cwd, target.slice("feature:".length));
  }
  const config = PACKAGE_DEPS[target as AddTarget];
  if (!config) {
    throw new Error(
      `unknown target "${target}". Supported: ${Object.values(ADD_TARGETS).join(", ")} | feature:<name>`,
    );
  }
  const installCmd = `bun add ${config.dev ? "-d " : ""}${config.deps.join(" ")}`;
  const notes: string[] = [];
  if (target === "testing") {
    notes.push("Add to vitest.config.ts: setupFiles: ['./tests/setup.ts']");
    notes.push("Copy tests/setup.ts from @021is/spine-ts/examples/next-app-starter/");
  }
  if (target === "auth") {
    notes.push("Build a verifier: `import { JwksVerifier } from '@021is/spine-auth'`");
    notes.push("Wire env var ELVIX_JWKS_URI in your src/lib/env.ts");
  }
  if (target === "i18n") {
    notes.push("Create src/i18n/<locale>.json catalogs (en, de, ...)");
    notes.push("Wire spine-lint rule spine/i18n-key-parity in your CI");
  }
  return {
    installed: config.deps,
    filesCreated: [],
    notes,
    commands: [installCmd],
  };
}

function planAddFeature(cwd: string, name: string): AddResult & { commands: string[] } {
  const slug = name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
  const root = join(cwd, "src/feature", slug);
  if (existsSync(root)) {
    throw new Error(`feature folder already exists: ${root}`);
  }
  const dirs = [
    "domain",
    "ports",
    "adapters/memory",
    "adapters/prisma",
    "usecase/tests",
    "schema/tests",
    "components",
    "hooks",
  ];
  for (const d of dirs) mkdirSync(join(root, d), { recursive: true });
  const files = [
    [`domain/${capitalize(slug)}.ts`, `export interface ${capitalize(slug)} {\n  id: string;\n}\n`],
    [
      `ports/${capitalize(slug)}Repo.ts`,
      `import type { ${capitalize(slug)} } from "../domain/${capitalize(slug)}.js";\nexport interface ${capitalize(slug)}Repo {\n  findById(id: string): Promise<${capitalize(slug)} | null>;\n}\n`,
    ],
    [
      "index.ts",
      `// Public surface for the ${slug} feature — only these symbols leave.\nexport type { ${capitalize(slug)} } from "./domain/${capitalize(slug)}.js";\nexport type { ${capitalize(slug)}Repo } from "./ports/${capitalize(slug)}Repo.js";\n`,
    ],
  ];
  const created: string[] = [];
  for (const [path, content] of files) {
    if (!path || content === undefined) continue;
    const full = join(root, path);
    writeFileSync(full, content);
    created.push(join("src/feature", slug, path));
  }
  return {
    installed: [],
    filesCreated: created,
    notes: [
      `Scaffolded feature folder at src/feature/${slug}/`,
      "Add use cases, schemas, components as you build the feature.",
      "Don't import from feature/<other>/{usecase,domain,...} directly — go via index.ts.",
    ],
    commands: [],
  };
}

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0]!.toUpperCase() + s.slice(1).replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
}

/**
 * `spine upgrade` — bump every @021is/spine-* dep in package.json to the
 * latest published version, in lockstep. Doesn't run install.
 */
export function planUpgrade(
  cwd: string,
  latest: string,
): { changed: { name: string; from: string; to: string }[] } {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) throw new Error("no package.json at cwd");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const changed: { name: string; from: string; to: string }[] = [];
  const target = `^${latest}`;
  for (const field of ["dependencies", "devDependencies"] as const) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, current] of Object.entries(deps)) {
      if (!name.startsWith("@021is/spine")) continue;
      if (current === target) continue;
      deps[name] = target;
      changed.push({ name, from: current, to: target });
    }
  }
  if (changed.length > 0) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  return { changed };
}
