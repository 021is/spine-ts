import { afterEach, describe, expect, it } from "vitest";
import { deterministicIds, freezeTime } from "../src/time.js";

describe("freezeTime", () => {
  let clock: ReturnType<typeof freezeTime> | undefined;
  afterEach(() => {
    clock?.restore();
    clock = undefined;
  });

  it("freezes Date.now at the requested instant", () => {
    clock = freezeTime("2026-05-24T12:00:00Z");
    expect(new Date(Date.now()).toISOString()).toBe("2026-05-24T12:00:00.000Z");
  });

  it("advances by ms on demand", () => {
    clock = freezeTime("2026-05-24T12:00:00Z");
    clock.advance(60_000);
    expect(new Date(Date.now()).toISOString()).toBe("2026-05-24T12:01:00.000Z");
  });

  it("set jumps to a new instant", () => {
    clock = freezeTime("2026-01-01T00:00:00Z");
    clock.set("2026-12-31T23:59:00Z");
    expect(new Date(Date.now()).toISOString()).toBe("2026-12-31T23:59:00.000Z");
  });
});

describe("deterministicIds", () => {
  it("generates monotonic prefixed ids", () => {
    const ids = deterministicIds("usr");
    expect(ids.next()).toBe("usr_0001");
    expect(ids.next()).toBe("usr_0002");
    expect(ids.next()).toBe("usr_0003");
  });

  it("resets on demand", () => {
    const ids = deterministicIds("evt");
    ids.next();
    ids.next();
    ids.reset();
    expect(ids.next()).toBe("evt_0001");
  });
});
