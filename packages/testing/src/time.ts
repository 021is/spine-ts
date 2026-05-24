import { vi } from "vitest";

/**
 * Freeze time at a deterministic instant so date-sensitive tests (rate-limit
 * buckets, sliding windows, expiry checks, audit timestamps) don't flake.
 *
 *   const clock = freezeTime("2026-05-24T12:00:00Z");
 *   // ... do stuff
 *   clock.advance(60_000); // +60s
 *   clock.restore();
 *
 * Wraps vi.useFakeTimers but with the right defaults — DO NOT FAKE
 * `setImmediate` / `nextTick` (Prisma + pg drivers depend on them).
 */
export interface FrozenClock {
  now(): Date;
  advance(ms: number): void;
  set(date: Date | string | number): void;
  restore(): void;
}

export function freezeTime(initial: Date | string | number): FrozenClock {
  const start = new Date(initial);
  vi.useFakeTimers({
    now: start,
    shouldAdvanceTime: false,
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
  });
  return {
    now: () => new Date(vi.getMockedSystemTime() ?? Date.now()),
    advance: (ms) => vi.advanceTimersByTime(ms),
    set: (d) => vi.setSystemTime(new Date(d)),
    restore: () => vi.useRealTimers(),
  };
}

/**
 * Deterministic UUID generator for snapshot stability.
 * Returns `id_0001`, `id_0002`, ... resetting on each construction.
 */
export function deterministicIds(prefix = "id"): { next(): string; reset(): void } {
  let n = 0;
  return {
    next: () => `${prefix}_${String(++n).padStart(4, "0")}`,
    reset: () => {
      n = 0;
    },
  };
}
