import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "../src/runner.js";

describe("spine/route-returns-response-dto", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spine-lint-"));
    mkdirSync(join(dir, "src/app/api/foo"), { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("flags raw route handlers that don't go through withErrorHandling", async () => {
    writeFileSync(
      join(dir, "src/app/api/foo/route.ts"),
      `
export async function GET(req: Request) {
  return Response.json({ foo: "bar" });
}
`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/route-returns-response-dto"] });
    expect(r.errorCount).toBe(1);
    expect(r.violations[0]?.message).toMatch(/withErrorHandling/);
  });

  it("accepts handlers wrapped in withErrorHandling", async () => {
    writeFileSync(
      join(dir, "src/app/api/foo/route.ts"),
      `
import { withErrorHandling, ok } from "@021is/spine-errors/next";
export const GET = withErrorHandling(async () => Response.json(ok({ foo: "bar" })));
`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/route-returns-response-dto"] });
    expect(r.errorCount).toBe(0);
  });

  it("accepts handlers that explicitly use ok() / err()", async () => {
    writeFileSync(
      join(dir, "src/app/api/foo/route.ts"),
      `
import { ok, err } from "@021is/spine-errors";
export async function GET() {
  return Response.json(ok({ foo: "bar" }));
}
`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/route-returns-response-dto"] });
    expect(r.errorCount).toBe(0);
  });
});
