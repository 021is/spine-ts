# @021.is/spine-ratelimit

Postgres-backed sliding-window rate limiter. Sliding-window per-key buckets. Multi-window in parallel (1m + 1h + 1d). No Redis required.

## Use

```ts
import { RateLimiter, makePrismaStore } from "@021.is/spine-ratelimit";

const limiter = new RateLimiter({ store: makePrismaStore(prisma) });

// On every API request:
await limiter.hit({
  subject: `api-key:${keyId}`,
  limits: [
    { window: "1m", max: 60 },
    { window: "1d", max: 100_000 },
  ],
}); // throws RateLimitedException → spine-errors maps to 429 + Retry-After
```

## Prisma schema

```prisma
model RateLimitBucket {
  subject     String
  window      String
  bucketStart DateTime
  count       Int      @default(0)
  @@id([subject, window, bucketStart])
}
```

## Behavior

- Atomic `UPSERT + increment` per (subject, window, bucketStart). Postgres guarantees concurrency safety.
- Multi-window in parallel: a single `hit()` checks 1m AND 1d limits at once.
- `RateLimitedException.retryAfterSec` reflects the **tightest** window — the one that has the least time until reset.
- Subject isolation: different subjects share zero state.

## In-memory adapter (for tests)

```ts
import { makeMemoryStore } from "@021.is/spine-ratelimit";
const limiter = new RateLimiter({ store: makeMemoryStore() });
```

## Why Postgres, not Redis

- One less infrastructure component
- Atomic guarantees come free with Postgres
- For typical 021 workloads (≤ 1k req/s per app), Postgres handles it without breaking a sweat
- Cleanup: prune buckets older than your widest window via a daily cron
