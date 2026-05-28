# @021.is/spine-cache

TTL + tag-invalidation cache with **single-flight dedupe**. Fixes the classic N+1: 10 components asking for the same user concurrently → 1 backend call.

## Use

```ts
import { makeMemoryCache, makeKey } from "@021.is/spine-cache";

const cache = makeMemoryCache();

async function getUser(id: string) {
  return cache.fetch(
    makeKey("user", id),
    async () => db.user.findUniqueOrThrow({ where: { id } }),
    { ttlMs: 60_000, tags: ["user", `user:${id}`] },
  );
}

// Invalidate by key or by tag
cache.invalidate(makeKey("user", id));
cache.invalidateTag("user"); // wipes ALL user entries
```

## Why single-flight matters

Without dedupe: 10 concurrent components each call `getUser("u_1")` → 10 DB hits. With dedupe: 1 promise shared → 1 DB hit.

## Helpers

- `makeKey("user", id, "lang", "en")` → `"user:u_1:lang:en"` (readable in dashboards)
- `cache.size()` for observability
- `cache.clear()` for tests

## Why not Next.js `unstable_cache` directly

You can combine them — `unstable_cache` for cross-request, `spine-cache` for in-request dedupe. spine-cache is process-local (no Redis), zero deps.
