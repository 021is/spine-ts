import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineAction } from "../src/index.js";
import { ForbiddenException, UnauthorizedException } from "@021/spine-errors";

describe("defineAction", () => {
  it("returns success ResponseDto on happy path", async () => {
    const action = defineAction({
      input: z.object({ id: z.string() }),
      handler: async ({ input }) => ({ echoed: input.id }),
    });
    const r = await action.run({ id: "x_1" });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ echoed: "x_1" });
    expect(r.code).toBe(200);
  });

  it("returns 400 on invalid input", async () => {
    const action = defineAction({
      input: z.object({ id: z.string().min(3) }),
      handler: async () => "ok",
    });
    const r = await action.run({ id: "" });
    expect(r.success).toBe(false);
    expect(r.code).toBe(400);
    expect(r.errorMessage).toMatch(/Invalid input/);
    expect(r.errorKey).toBe("validation.failed");
  });

  it("maps thrown UnauthorizedException → 401", async () => {
    const action = defineAction({
      input: z.object({}),
      auth: async () => {
        throw new UnauthorizedException();
      },
      handler: async () => "x",
    });
    const r = await action.run({});
    expect(r.code).toBe(401);
  });

  it("maps thrown ForbiddenException → 403", async () => {
    const action = defineAction({
      input: z.object({}),
      handler: async () => {
        throw new ForbiddenException("nope");
      },
    });
    const r = await action.run({});
    expect(r.code).toBe(403);
  });

  it("calls auditor with the audit row when handler succeeds", async () => {
    const auditor = vi.fn();
    const action = defineAction({
      input: z.object({ id: z.string() }),
      audit: (input) => ({ action: "test", targetId: input.id }),
      auditor,
      handler: async () => "ok",
    });
    await action.run({ id: "x" });
    expect(auditor).toHaveBeenCalledWith({ action: "test", targetId: "x" });
  });

  it("does NOT audit when handler throws", async () => {
    const auditor = vi.fn();
    const action = defineAction({
      input: z.object({ id: z.string() }),
      audit: () => ({ action: "test" }),
      auditor,
      handler: async () => {
        throw new ForbiddenException();
      },
    });
    await action.run({ id: "x" });
    expect(auditor).not.toHaveBeenCalled();
  });

  it("invokes onRevalidate for each returned path on success", async () => {
    const revalidate = vi.fn();
    const action = defineAction({
      input: z.object({ slug: z.string() }),
      revalidate: (input) => [`/events/${input.slug}`, "/events"],
      onRevalidate: revalidate,
      handler: async () => "ok",
    });
    await action.run({ slug: "tango-night" });
    expect(revalidate).toHaveBeenCalledTimes(2);
    expect(revalidate).toHaveBeenCalledWith("/events/tango-night");
    expect(revalidate).toHaveBeenCalledWith("/events");
  });
});
