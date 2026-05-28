import { describe, expect, it } from "vitest";
import { currentRequestId, makeLogger, newRequestId, withRequestContext } from "../src/logger.js";

describe("makeLogger", () => {
  it("creates a logger with base fields", () => {
    const log = makeLogger({ service: "my-app", cluster: "eu-1", env: "prod" });
    expect(log.level).toBe("info");
  });

  it("respects custom level", () => {
    const log = makeLogger({ service: "x", level: "debug" });
    expect(log.level).toBe("debug");
  });
});

describe("withRequestContext / currentRequestId", () => {
  it("attaches requestId visible via currentRequestId() across awaits", async () => {
    let observed: string | undefined;
    await withRequestContext({ requestId: "req_123" }, async () => {
      await Promise.resolve();
      observed = currentRequestId();
    });
    expect(observed).toBe("req_123");
  });

  it("isolates contexts between concurrent runs", async () => {
    const seen = new Set<string>();
    await Promise.all([
      withRequestContext({ requestId: "req_A" }, async () => {
        await Promise.resolve();
        seen.add(`A=${currentRequestId()}`);
      }),
      withRequestContext({ requestId: "req_B" }, async () => {
        await Promise.resolve();
        seen.add(`B=${currentRequestId()}`);
      }),
    ]);
    expect(seen).toEqual(new Set(["A=req_A", "B=req_B"]));
  });

  it("returns undefined outside a context", () => {
    expect(currentRequestId()).toBeUndefined();
  });
});

describe("newRequestId", () => {
  it("produces a req_-prefixed string", () => {
    const id = newRequestId();
    expect(id).toMatch(/^req_[a-z0-9]+$/);
  });
  it("produces a fresh value each call", () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
  });
});
