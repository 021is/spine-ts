# @021.is/spine-testing

Shared test helpers used by every product. Lets every repo's `tests/setup.ts` look the same.

## What's in the box

| Subpath | Purpose |
|---|---|
| `@021.is/spine-testing/postgres` | `startSharedPostgres()` — Testcontainers PG per Vitest worker. `runPrismaMigrate()` — apply your schema once. `truncateAll()` — clean between tests without restart. |
| `@021.is/spine-testing/jwks` | `startJwksMockServer()` — in-process RS256 JWKS endpoint + `signToken()`. Point your auth middleware at it; no real elvix needed. |
| `@021.is/spine-testing/msw` | `startMockServer()` — MSW for outbound HTTP. Mock Resend / Stripe / R2 / Google. |
| `@021.is/spine-testing/time` | `freezeTime()` + `deterministicIds()` — stable timestamps + ids for snapshot + rate-limit tests. |

## Reference setup

```ts
// tests/setup.ts
import { beforeAll, afterAll, afterEach } from "vitest";
import { startSharedPostgres, runPrismaMigrate, truncateAll } from "@021.is/spine-testing/postgres";
import { startMockServer } from "@021.is/spine-testing/msw";

let dbUrl: string;
const mocks = startMockServer();

beforeAll(async () => {
  dbUrl = await startSharedPostgres();
  process.env.DATABASE_URL = dbUrl;
  await runPrismaMigrate(dbUrl, { mode: "push" }); // fast for tests
}, 60_000);

afterEach(async () => {
  await truncateAll(dbUrl);
  mocks.reset();
});

afterAll(() => {
  mocks.stop();
  // Postgres container is reaped by Testcontainers on process exit.
});
```

## Why Testcontainers > mocks

The rule: "mocks lie when production diverges." A real Postgres runs your real migrations, executes your real SQL, surfaces real index bugs. The cost (~1.5s per worker cold start) is amortized over the whole suite.

## Performance notes

- **Shared container per worker.** `startSharedPostgres()` uses a globalThis slot — one container per Vitest worker process, not per test file.
- **Migrate once, truncate often.** `runPrismaMigrate()` in `beforeAll`; `truncateAll()` in `afterEach`. ~50ms per test after the first.
- **`mode: "push"` for tests.** Skip the migration table and just `db push` from `schema.prisma`. Much faster than `deploy` when you don't need migration history fidelity.
- **CI: shard your tests.** `vitest run --shard=1/4` × 4 GH Actions matrix jobs = 4× wall clock.
