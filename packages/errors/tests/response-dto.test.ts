import { describe, expect, it } from "vitest";
import { err, ok } from "../src/response-dto.js";

describe("ResponseDto: ok()", () => {
  it("returns success envelope with data + 200 + timestamp", () => {
    const r = ok({ id: "u_1", name: "Edvard" });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ id: "u_1", name: "Edvard" });
    expect(r.code).toBe(200);
    expect(r.timestamp).toBeGreaterThan(0);
    expect(r.errorMessage).toBeUndefined();
  });

  it("accepts a successMessage", () => {
    const r = ok(null, { successMessage: "User saved." });
    expect(r.successMessage).toBe("User saved.");
  });

  it("accepts a custom code (e.g. 201 Created)", () => {
    const r = ok({ id: "x" }, { code: 201 });
    expect(r.code).toBe(201);
  });

  it("propagates requestId", () => {
    const r = ok({}, { requestId: "req_abc123" });
    expect(r.requestId).toBe("req_abc123");
  });
});

describe("ResponseDto: err()", () => {
  it("returns failure envelope with null data by default", () => {
    const r = err(400, "Bad input");
    expect(r.success).toBe(false);
    expect(r.data).toBeNull();
    expect(r.code).toBe(400);
    expect(r.errorMessage).toBe("Bad input");
  });

  it("carries errorKey + errorParams for i18n", () => {
    const r = err(404, "User not found", {
      errorKey: "user.not_found",
      errorParams: { id: "u_42" },
    });
    expect(r.errorKey).toBe("user.not_found");
    expect(r.errorParams).toEqual({ id: "u_42" });
  });

  it("allows non-null data on error (e.g. validation errors detail)", () => {
    type ValidationDetail = { field: string; problem: string }[];
    const r = err<ValidationDetail>(400, "Validation failed", {
      data: [{ field: "email", problem: "format" }],
    });
    expect(r.data).toEqual([{ field: "email", problem: "format" }]);
  });

  it("returns null data when data option omitted", () => {
    const r = err(500, "boom");
    expect(r.data).toBeNull();
  });
});
