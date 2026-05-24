import { describe, expect, it } from "vitest";
import { UnauthorizedException } from "@021/spine-errors";
import { makeHmacVerifier, makeMemoryIdempotencyStore } from "../src/index.js";

describe("makeHmacVerifier", () => {
  const verifier = makeHmacVerifier({ secret: "test-secret" });

  it("raw HMAC accepts valid signature", () => {
    const body = '{"event":"x"}';
    const sig = verifier.computeSignature(body, "raw");
    expect(() => verifier.verify({ payload: body, signature: sig, headerScheme: "raw" })).not.toThrow();
  });

  it("raw HMAC rejects tampered payload", () => {
    const body = '{"event":"x"}';
    const sig = verifier.computeSignature(body, "raw");
    expect(() =>
      verifier.verify({ payload: '{"event":"tampered"}', signature: sig, headerScheme: "raw" }),
    ).toThrow(UnauthorizedException);
  });

  it("github scheme accepts sha256=… prefix", () => {
    const body = "ping";
    const sig = verifier.computeSignature(body, "github");
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(() =>
      verifier.verify({ payload: body, signature: sig, headerScheme: "github" }),
    ).not.toThrow();
  });

  it("stripe scheme accepts t=…,v1=… and respects tolerance", () => {
    const body = '{"id":"evt_1"}';
    const now = 1_700_000_000;
    const sig = verifier.computeSignature(body, "stripe", now);
    expect(() =>
      verifier.verify({ payload: body, signature: sig, headerScheme: "stripe", nowSec: now + 30 }),
    ).not.toThrow();
  });

  it("stripe scheme rejects out-of-tolerance timestamp", () => {
    const body = "x";
    const sig = verifier.computeSignature(body, "stripe", 1_700_000_000);
    expect(() =>
      verifier.verify({
        payload: body,
        signature: sig,
        headerScheme: "stripe",
        nowSec: 1_700_001_000, // +16 min, outside 5min tolerance
      }),
    ).toThrow(UnauthorizedException);
  });

  it("resend scheme verifies v1,<b64> format", () => {
    const body = '{"type":"email.delivered"}';
    const sig = verifier.computeSignature(body, "resend");
    expect(sig.startsWith("v1,")).toBe(true);
    expect(() =>
      verifier.verify({ payload: body, signature: sig, headerScheme: "resend" }),
    ).not.toThrow();
  });
});

describe("makeMemoryIdempotencyStore", () => {
  it("first time returns false, subsequent returns true", async () => {
    const store = makeMemoryIdempotencyStore();
    expect(await store.seen("evt_1")).toBe(false);
    expect(await store.seen("evt_1")).toBe(true);
    expect(await store.seen("evt_1")).toBe(true);
  });

  it("isolates keys", async () => {
    const store = makeMemoryIdempotencyStore();
    expect(await store.seen("a")).toBe(false);
    expect(await store.seen("b")).toBe(false);
    expect(await store.seen("a")).toBe(true);
  });
});
