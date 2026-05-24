import { describe, expect, it } from "vitest";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  RateLimitedException,
  TranslatableException,
  UnauthorizedException,
} from "../src/exceptions.js";

describe("exceptions: TranslatableException", () => {
  it("has the right name + message + i18n metadata", () => {
    const e = new BadRequestException("Email is invalid", {
      translationKey: "validation.email.invalid",
      translationParams: { value: "not-an-email" },
    });
    expect(e.name).toBe("BadRequestException");
    expect(e.message).toBe("Email is invalid");
    expect(e.translationKey).toBe("validation.email.invalid");
    expect(e.translationParams).toEqual({ value: "not-an-email" });
    expect(e).toBeInstanceOf(TranslatableException);
    expect(e).toBeInstanceOf(Error);
  });

  it("each exception subclass identifies via instanceof", () => {
    expect(new BadRequestException()).toBeInstanceOf(BadRequestException);
    expect(new UnauthorizedException()).toBeInstanceOf(UnauthorizedException);
    expect(new ForbiddenException()).toBeInstanceOf(ForbiddenException);
    expect(new NotFoundException()).toBeInstanceOf(NotFoundException);
    expect(new ConflictException()).toBeInstanceOf(ConflictException);
  });

  it("provides sensible default messages when no message given", () => {
    expect(new BadRequestException().message).toContain("Bad request");
    expect(new UnauthorizedException().message).toContain("Authentication");
    expect(new ForbiddenException().message).toContain("permission");
    expect(new NotFoundException().message).toContain("not found");
    expect(new ConflictException().message).toContain("Conflict");
  });

  it("RateLimitedException carries retryAfterSec", () => {
    const e = new RateLimitedException(42);
    expect(e.retryAfterSec).toBe(42);
    expect(e.message).toContain("Rate limit");
  });

  it("preserves cause chain", () => {
    const root = new Error("connection refused");
    const e = new BadRequestException("Upstream rejected", { cause: root });
    expect(e.cause).toBe(root);
  });
});
