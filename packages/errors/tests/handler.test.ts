import { describe, expect, it, vi } from "vitest";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  RateLimitedException,
  UnauthorizedException,
} from "../src/exceptions.js";
import { toHandledError } from "../src/handler.js";

describe("toHandledError", () => {
  it("maps BadRequestException → 400", () => {
    const r = toHandledError(new BadRequestException("nope"));
    expect(r.status).toBe(400);
    expect(r.response.success).toBe(false);
    expect(r.response.errorMessage).toBe("nope");
    expect(r.isInternal).toBe(false);
  });

  it("maps UnauthorizedException → 401", () => {
    const r = toHandledError(new UnauthorizedException());
    expect(r.status).toBe(401);
  });

  it("maps ForbiddenException → 403", () => {
    const r = toHandledError(new ForbiddenException());
    expect(r.status).toBe(403);
  });

  it("maps NotFoundException → 404", () => {
    const r = toHandledError(new NotFoundException("missing"));
    expect(r.status).toBe(404);
    expect(r.response.errorMessage).toBe("missing");
  });

  it("maps RateLimitedException → 429 + Retry-After header", () => {
    const r = toHandledError(new RateLimitedException(15));
    expect(r.status).toBe(429);
    expect(r.headers).toEqual({ "Retry-After": "15" });
  });

  it("propagates i18n metadata", () => {
    const r = toHandledError(
      new BadRequestException("Email is invalid", {
        translationKey: "validation.email.invalid",
        translationParams: { value: "x" },
      }),
    );
    expect(r.response.errorKey).toBe("validation.email.invalid");
    expect(r.response.errorParams).toEqual({ value: "x" });
  });

  it("logs internal errors via the provided logger", () => {
    const logger = { error: vi.fn() };
    toHandledError(new TypeError("kaboom"), { logger });
    expect(logger.error).toHaveBeenCalledOnce();
    const [msg, meta] = logger.error.mock.calls[0]!;
    expect(msg).toContain("kaboom");
    expect(meta?.name).toBe("TypeError");
  });

  it("maps unknown errors → 500 internal", () => {
    const r = toHandledError(new Error("uncaught"));
    expect(r.status).toBe(500);
    expect(r.isInternal).toBe(true);
  });

  it("handles thrown non-Error values", () => {
    const r = toHandledError("a string");
    expect(r.status).toBe(500);
    expect(r.response.errorMessage).toBe("a string");
  });

  it("attaches requestId to the response", () => {
    const r = toHandledError(new BadRequestException(), { requestId: "req_xyz" });
    expect(r.response.requestId).toBe("req_xyz");
  });
});
