import { RateLimitedException } from "@021is/spine-errors";
import type { freezeTime } from "@021is/spine-testing/time";
import { afterEach, describe, expect, it } from "vitest";
import { RateLimiter, makeMemoryStore } from "../src/index.js";

describe("RateLimiter", () => {
  let clock: ReturnType<typeof freezeTime> | undefined;
  afterEach(() => {
    clock?.restore();
    clock = undefined;
  });

  it("allows up to max per minute", async () => {
    const limiter = new RateLimiter({ store: makeMemoryStore() });
    for (let i = 0; i < 5; i++) {
      await limiter.hit({
        subject: "user:1",
        limits: [{ window: "1m", max: 5 }],
        now: new Date("2026-05-24T12:00:00Z"),
      });
    }
    // 6th in the same minute should throw
    await expect(
      limiter.hit({
        subject: "user:1",
        limits: [{ window: "1m", max: 5 }],
        now: new Date("2026-05-24T12:00:30Z"),
      }),
    ).rejects.toThrow(RateLimitedException);
  });

  it("rolls into the next minute bucket cleanly", async () => {
    const limiter = new RateLimiter({ store: makeMemoryStore() });
    for (let i = 0; i < 5; i++) {
      await limiter.hit({
        subject: "user:1",
        limits: [{ window: "1m", max: 5 }],
        now: new Date("2026-05-24T12:00:30Z"),
      });
    }
    // Roll to next minute — limit refreshes
    await expect(
      limiter.hit({
        subject: "user:1",
        limits: [{ window: "1m", max: 5 }],
        now: new Date("2026-05-24T12:01:00Z"),
      }),
    ).resolves.toBeUndefined();
  });

  it("enforces multiple limits simultaneously (1m + 1d)", async () => {
    const limiter = new RateLimiter({ store: makeMemoryStore() });
    const limits = [
      { window: "1m" as const, max: 100 },
      { window: "1d" as const, max: 3 },
    ];
    const now = new Date("2026-05-24T12:00:00Z");
    await limiter.hit({ subject: "user:1", limits, now });
    await limiter.hit({ subject: "user:1", limits, now });
    await limiter.hit({ subject: "user:1", limits, now });
    // 4th in the day exceeds the daily cap even though minute limit is huge
    await expect(limiter.hit({ subject: "user:1", limits, now })).rejects.toThrow(/1d/);
  });

  it("RateLimitedException carries retryAfterSec close to the window edge", async () => {
    const limiter = new RateLimiter({ store: makeMemoryStore() });
    const now = new Date("2026-05-24T12:00:00Z");
    await limiter.hit({ subject: "x", limits: [{ window: "1m", max: 1 }], now });
    try {
      await limiter.hit({ subject: "x", limits: [{ window: "1m", max: 1 }], now });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitedException);
      const re = e as RateLimitedException;
      expect(re.retryAfterSec).toBeGreaterThan(0);
      expect(re.retryAfterSec).toBeLessThanOrEqual(60);
    }
  });

  it("isolates subjects from each other", async () => {
    const limiter = new RateLimiter({ store: makeMemoryStore() });
    const limits = [{ window: "1m" as const, max: 1 }];
    const now = new Date("2026-05-24T12:00:00Z");
    await limiter.hit({ subject: "user:A", limits, now });
    await limiter.hit({ subject: "user:B", limits, now });
    // Both A and B used their one allowance — third hit on either throws.
    await expect(limiter.hit({ subject: "user:A", limits, now })).rejects.toThrow();
  });
});
