/**
 * TTL + tag-based cache abstraction. Goals:
 *   - Reduce backend round-trips (the DC-web rate-limit scar Edvard called out)
 *   - One uniform API across Next.js `unstable_cache`, in-memory, and Redis later
 *
 * For Next.js server components: use `cached(fn, { keyParts, ttlMs, tags })`
 * which wraps `unstable_cache` so the same call across components dedupes.
 *
 * For non-Next runtimes (workers, scripts, helvix dashboard backend code):
 * use `makeMemoryCache()` and call `.fetch(key, fn, opts)`.
 */
export interface CacheOptions {
  ttlMs?: number;
  /** Optional tags used to invalidate sets (Next.js `revalidateTag` compatible). */
  tags?: string[];
}

export interface MemoryCache {
  fetch<T>(key: string, fn: () => Promise<T>, opts?: CacheOptions): Promise<T>;
  invalidate(key: string): void;
  invalidateTag(tag: string): void;
  clear(): void;
  /** For tests / observability. */
  size(): number;
}

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
  tags: string[];
}

export function makeMemoryCache(): MemoryCache {
  const map = new Map<string, MemoryEntry>();
  const inFlight = new Map<string, Promise<unknown>>();
  const tagIndex = new Map<string, Set<string>>();

  function indexTags(key: string, tags: string[]) {
    for (const t of tags) {
      let bucket = tagIndex.get(t);
      if (!bucket) {
        bucket = new Set();
        tagIndex.set(t, bucket);
      }
      bucket.add(key);
    }
  }

  return {
    async fetch<T>(key, fn, opts) {
      const now = Date.now();
      const entry = map.get(key);
      if (entry && entry.expiresAt > now) return entry.value as T;

      // Single-flight dedupe — multiple concurrent callers share the work.
      const pending = inFlight.get(key);
      if (pending) return (await pending) as T;

      const promise = (async () => {
        try {
          const value = await fn();
          const ttl = opts?.ttlMs ?? 60_000;
          const tags = opts?.tags ?? [];
          map.set(key, { value, expiresAt: now + ttl, tags });
          indexTags(key, tags);
          return value;
        } finally {
          inFlight.delete(key);
        }
      })();
      inFlight.set(key, promise);
      return (await promise) as T;
    },
    invalidate(key) {
      map.delete(key);
    },
    invalidateTag(tag) {
      const keys = tagIndex.get(tag);
      if (!keys) return;
      for (const k of keys) map.delete(k);
      tagIndex.delete(tag);
    },
    clear() {
      map.clear();
      inFlight.clear();
      tagIndex.clear();
    },
    size: () => map.size,
  };
}

/**
 * Build a stable cache key from a tag + ordered parts. Keeps keys readable
 * (`user:u_1:lang:en`) so dashboards can grep.
 */
export function makeKey(prefix: string, ...parts: (string | number | undefined | null)[]): string {
  return [prefix, ...parts.filter((p) => p != null).map(String)].join(":");
}
