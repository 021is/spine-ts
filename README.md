# Spine-TS

The universal TypeScript service doctrine + 15 shared packages for every 021 product.

Render `knowledge/code.md` concrete for Next.js + Node:
- **Same shape in every repo.** See [STRUCTURE.md](./STRUCTURE.md).
- **Same plumbing in every repo.** ResponseDto, auth, http, telemetry, actions, ratelimit, webhooks, email, cache, jobs, i18n, query, testing, env.
- **Same CLI in every repo.** `spine new` / `spine doctor`.

## Packages

| Package | What |
|---|---|
| [@021.is/spine-errors](./packages/errors) | ResponseDto + 9 exceptions + framework-agnostic handler. Lifted from DC's `shared-lib`. |
| [@021.is/spine-env](./packages/env) | Zod-validated env loader. Fails LOUDLY at startup. |
| [@021.is/spine-testing](./packages/testing) | Testcontainers PG, Prisma migrator, JWKS mock, MSW factory, freezeTime. |
| [@021.is/spine-http](./packages/http) | Typed fetch client with timeout + retry + circuit-break. |
| [@021.is/spine-auth](./packages/auth) | JWKS verifier (RS256) + requireRoles/requireScopes. |
| [@021.is/spine-telemetry](./packages/telemetry) | Pino structured logger + AsyncLocalStorage request context. |
| [@021.is/spine-actions](./packages/actions) | defineAction({ input, auth, audit, revalidate, handler }) → ResponseDto. |
| [@021.is/spine-ratelimit](./packages/ratelimit) | Postgres sliding-window limiter. Generalized from elvix's pattern. |
| [@021.is/spine-webhooks](./packages/webhooks) | HMAC verifier (raw, github, stripe, resend) + idempotency dedupe. |
| [@021.is/spine-email](./packages/email) | Resend wrapper with 5xx retry + 4xx terminal. |
| [@021.is/spine-cache](./packages/cache) | TTL + tag invalidation + single-flight dedupe. |
| [@021.is/spine-jobs](./packages/jobs) | NATS JetStream publisher + consumer. |
| [@021.is/spine-i18n](./packages/i18n) | Hexagonal i18n (R2/fs/memory adapters, CLDR plurals, React + server). |
| [@021.is/spine-query](./packages/query) | TanStack Query defaults that minimize backend traffic. |
| [@021.is/spine](./packages/cli) | CLI: `spine new` (scaffold), `spine doctor` (audit). |

## Boot

```bash
git clone git@github.com:021is/spine-ts.git
cd spine-ts
bun install
bun run test          # 114 tests passing
bun run build         # builds all 15 packages
```

## Use in an app

```bash
spine new my-app --type next-app
cd my-app
bun install
bun run test
```

Or in an existing repo:

```bash
bun add @021.is/spine-errors @021.is/spine-env @021.is/spine-auth @021.is/spine-actions @021.is/spine-i18n
bun add -d @021.is/spine-testing vitest @vitest/coverage-v8 playwright
```

## Doctrine

- [STRUCTURE.md](./STRUCTURE.md) — folder shape every 021 app + every Spine package follows.
- [AGENTS.md](./AGENTS.md) — repo-local agent rules.
- `axon/knowledge/code.md` — universal code standards Spine renders concrete.

## Status

| Wave | Packages | Tests |
|---|---|---|
| A | errors + env + testing | 38 |
| B | http + auth + telemetry + actions | 32 |
| C | ratelimit + webhooks + email + cache + i18n + jobs + query | 38 |
| D | spine CLI (scaffold + doctor) | 6 |
| **Total** | **15** | **114** |
