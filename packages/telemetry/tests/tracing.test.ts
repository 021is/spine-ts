import { describe, expect, it } from "vitest";
import { getTracer, withSpan } from "../src/tracing.js";

describe("withSpan (no SDK init — no-op tracer)", () => {
  it("returns the wrapped function's value", async () => {
    const v = await withSpan("test.op", async () => 42);
    expect(v).toBe(42);
  });

  it("re-throws the wrapped function's error", async () => {
    await expect(
      withSpan("test.fail", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });

  it("passes the span to the callback (callable, has setAttribute etc.)", async () => {
    await withSpan("test.span", async (span) => {
      expect(typeof span.setAttribute).toBe("function");
      expect(typeof span.recordException).toBe("function");
      expect(typeof span.end).toBe("function");
    });
  });
});

describe("getTracer", () => {
  it("returns a tracer object with startActiveSpan", () => {
    const t = getTracer();
    expect(typeof t.startActiveSpan).toBe("function");
  });
});
