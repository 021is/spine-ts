# Migrating an existing 021 app onto Spine

Step-by-step path that any 021 TypeScript repo can follow to adopt Spine. Order matters — earlier steps reduce churn for later ones.

## Pre-flight (10 min)

- Confirm `~/.npmrc` on your dev machine has the @021.is scope wired (see [README — Use in an app](./README.md)).
- Branch off main: `git checkout -b spine/migrate`.
- Lock the current state: `git tag pre-spine && git push --tags`.

## Phase 1 — Install + wire configs (15 min)

```bash
# Install Spine
bun add @021.is/spine-errors @021.is/spine-env
bun add -d @021.is/spine-testing @021.is/spine-quality @021.is/spine-lint
bun add -d vitest @vitest/coverage-v8 @biomejs/biome typescript playwright
```

Wire configs:

```jsonc
// biome.json
{ "extends": "@021.is/spine-quality/biome" }
```

```jsonc
// tsconfig.json
{ "extends": "@021.is/spine-quality/tsconfig-next" }   // or /tsconfig for non-Next
```

```jsonc
// knip.json
{ "extends": "@021.is/spine-quality/knip" }
```

```js
// .dependency-cruiser.cjs
module.exports = require("@021.is/spine-quality/dependency-cruiser");
```

Add scripts to `package.json`:

```jsonc
{
  "scripts": {
    "lint": "biome check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --reporter=verbose --reporter=github-actions",
    "test:watch": "vitest"
  }
}
```

Run them. Expect violations. Don't fix yet — see Phase 2.

## Phase 2 — Fix the biome + tsc errors (~1–4 hours)

Order:
1. `bun run typecheck` — fix the easy stuff first (`any`, unused imports, missing returns).
2. `bun run lint` — biome will autofix most formatting. `bunx biome check --write` to apply.
3. Run `bunx knip` — delete dead exports + dead deps.
4. Run `bunx madge --circular --extensions ts,tsx src/` — break cycles.

If you hit `noExplicitAny` in too many places and need to ship today, narrow the rule scope in `biome.json` to `"warn"` instead of `"error"` and open an issue to clean up.

## Phase 3 — Adopt spine-errors (30 min — biggest UX win)

Find every route handler + server action. Wrap them:

```ts
// Before
export async function POST(req: Request) {
  const body = await req.json();
  const event = await publishEvent(body.id);
  return Response.json(event);
}

// After
import { withErrorHandling, ok } from "@021.is/spine-errors/next";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json();
  const event = await publishEvent(body.id);
  return Response.json(ok(event, { successMessage: "Event published" }));
});
```

Replace `throw new Error("not found")` with `throw new NotFoundException("Event not found")` etc.

Run `bunx spine-lint --rule spine/route-returns-response-dto .` to confirm.

## Phase 4 — Adopt spine-env (10 min)

```ts
// src/lib/env.ts
import { defineEnv, common } from "@021.is/spine-env";

export const env = defineEnv({
  schema: {
    NODE_ENV: common.nodeEnv(),
    DATABASE_URL: common.pgUrl(),
    APP_URL: common.httpsUrl(),
    RESEND_API_KEY: common.secret(),
    // ... your other vars
  },
});
```

Replace `process.env.X!` with `env.X` everywhere.

## Phase 5 — Tests on Spine-testing (1–2 hours)

```ts
// tests/setup.ts
import { afterAll, afterEach, beforeAll } from "vitest";
import { runPrismaMigrate, startSharedPostgres, truncateAll } from "@021.is/spine-testing/postgres";
import { startMockServer } from "@021.is/spine-testing/msw";

let dbUrl: string;
const mocks = startMockServer();

beforeAll(async () => {
  dbUrl = await startSharedPostgres();
  process.env.DATABASE_URL = dbUrl;
  await runPrismaMigrate(dbUrl, { mode: "push" });
}, 60_000);

afterEach(async () => { await truncateAll(dbUrl); mocks.reset(); });
afterAll(() => mocks.stop());
```

Add to `vitest.config.ts`:
```ts
test: { setupFiles: ["./tests/setup.ts"] }
```

Convert any test that uses Prisma mocks to use the real DB.

## Phase 6 — Refactor to hexagonal feature folders (largest effort)

For each existing "feature" (auth, event, billing, etc.):

1. Create `src/feature/<f>/{domain,ports,adapters,usecase,schema,components,hooks,index.ts}` skeleton.
2. Move existing files into the right buckets:
   - Pure functions / types → `domain/`
   - Prisma calls → wrap behind a port + adapter
   - Use cases → orchestrate ports
   - React components → `components/`
3. Export the public surface from `feature/<f>/index.ts`.
4. Update `src/app/` routes to call use cases via `feature/<f>/index.ts`.

Run `bunx depcruise --validate src/` to confirm no layer violations.

This is iterative — migrate ONE feature at a time, run tests, commit.

## Phase 7 — i18n on spine-i18n (if applicable, 30 min per language)

If you already have a translation system, port catalogs to `src/i18n/<locale>.json`. Replace your translator with `useT()` from `@021.is/spine-i18n/react`.

Run `bunx spine-lint --rule spine/i18n-key-parity .` to find keys that exist in some locales but not all.

## Phase 8 — Wire the gate in CI (5 min)

```yaml
# .github/workflows/pr.yml
on: [pull_request]
jobs:
  spine:
    uses: 021is/ci/.github/workflows/spine-quality-gate.yml@v1
    secrets: inherit
```

Plus the post-merge metrics workflow:

```yaml
# .github/workflows/post-merge.yml
on:
  push: { branches: [main] }
jobs:
  metrics:
    uses: 021is/ci/.github/workflows/spine-metrics.yml@v1
    secrets: inherit
```

Add the required secrets at the repo or org level:
- `ALERTMANAGER_USER`, `ALERTMANAGER_PASSWORD`, `ALERTMANAGER_URL`
- `SPINE_PROM_USER`, `SPINE_PROM_PASSWORD` (helvix-prom from vault)
- `SPINE_LOKI_USER`, `SPINE_LOKI_PASSWORD` (helvix-vector from vault)

Set branch protection on `main`: PR required, "Spine Quality Gate" status check required.

## Phase 9 — Verify (10 min)

```bash
bun run typecheck && bun run lint && bunx spine-lint . && bun run test
git push origin spine/migrate
# Open PR. Gate runs. Fix what fires.
```

After merge, check `grafana.021.is/d/spine-quality` — your repo should appear within 5 min.

## Known traps

- `bun add A B` (multi-package one-shot) sometimes fails on private scoped packages with cross-deps (bun 1.3.11 quirk). Split into `bun add A` then `bun add B`.
- Tests fail with `instanceof` errors across `@021.is/spine-*` packages → make sure your `vitest.config.ts` has `server.deps.inline: [/@021.is\/spine-/]`.
- Bundle-size job fails on first run → your `.size-limit.json` doesn't exist. Generate it via `bunx size-limit --json > .size-limit.json` after first build.

## Time estimate

Solo project, no existing tests:
- Phases 1–5: ~half a day
- Phase 6: 1–2 days per feature (most of the migration)
- Phases 7–9: ~half a day

Solo project, existing tests + clean type-checks:
- Phases 1–5: ~2 hours
- Phase 6: less than a day per feature
- Phases 7–9: ~2 hours
