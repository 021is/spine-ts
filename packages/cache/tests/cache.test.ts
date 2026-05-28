import { freezeTime } from "@021.is/spine-testing/time";
import { describe, expect, it, vi } from "vitest";
import { makeKey, makeMemoryCache } from "../src/index.js";

describe("makeMemoryCache", () => {
  it("caches function result for ttl", async () => {
    const clock = freezeTime("2026-05-24T12:00:00Z");
    try {
      const cache = makeMemoryCache();
      const fn = vi.fn(async () => "hello");
      const a = await cache.fetch("k", fn, { ttlMs: 60_000 });
      const b = await cache.fetch("k", fn, { ttlMs: 60_000 });
      expect(a).toBe("hello");
      expect(b).toBe("hello");
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      clock.restore();
    }
  });

  it("re-fetches after ttl expires", async () => {
    const clock = freezeTime("2026-05-24T12:00:00Z");
    try {
      const cache = makeMemoryCache();
      const fn = vi.fn(async () => Date.now());
      await cache.fetch("k", fn, { ttlMs: 1000 });
      clock.advance(2000);
      await cache.fetch("k", fn, { ttlMs: 1000 });
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      clock.restore();
    }
  });

  it("single-flight dedupes concurrent calls (fixes the dc-web N+1)", async () => {
    const cache = makeMemoryCache();
    let executions = 0;
    const fn = async () => {
      executions += 1;
      await new Promise((r) => setTimeout(r, 10));
      return "ok";
    };
    const results = await Promise.all([
      cache.fetch("k", fn, { ttlMs: 60_000 }),
      cache.fetch("k", fn, { ttlMs: 60_000 }),
      cache.fetch("k", fn, { ttlMs: 60_000 }),
      cache.fetch("k", fn, { ttlMs: 60_000 }),
    ]);
    expect(results).toEqual(["ok", "ok", "ok", "ok"]);
    expect(executions).toBe(1);
  });

  it("invalidate(key) removes a single entry", async () => {
    const cache = makeMemoryCache();
    const fn = vi.fn(async () => "a");
    await cache.fetch("k", fn);
    cache.invalidate("k");
    await cache.fetch("k", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("invalidateTag bulk-removes all entries tagged with it", async () => {
    const cache = makeMemoryCache();
    await cache.fetch("user:1", async () => "u1", { tags: ["user", "user:1"] });
    await cache.fetch("user:2", async () => "u2", { tags: ["user", "user:2"] });
    await cache.fetch("event:1", async () => "e1", { tags: ["event"] });
    expect(cache.size()).toBe(3);

    cache.invalidateTag("user");
    expect(cache.size()).toBe(1);
  });

  it("makeKey produces stable readable keys", () => {
    expect(makeKey("user", "u_1", "lang", "en")).toBe("user:u_1:lang:en");
    expect(makeKey("event", 42)).toBe("event:42");
    expect(makeKey("x", undefined, null, "y")).toBe("x:y");
  });
});
