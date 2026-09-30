import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "../src/runner.js";

describe("spine/enum-over-string", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spine-lint-"));
    mkdirSync(join(dir, "src"), { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("flags inline string-literal union in a type", async () => {
    writeFileSync(
      join(dir, "src/types.ts"),
      `export interface User { role: "admin" | "user" | "guest" }`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/enum-over-string"] });
    expect(r.errorCount).toBe(1);
    expect(r.violations[0]?.message).toMatch(/Inline string-literal union/);
  });

  it("flags repeated string-literal comparisons", async () => {
    writeFileSync(
      join(dir, "src/check.ts"),
      `
function isActive(s: string) {
  if (s === "active") return true;
  if (s === "active") return true;
  return false;
}
`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/enum-over-string"] });
    expect(r.warningCount).toBeGreaterThan(0);
    expect(r.violations[0]?.message).toMatch(/active.*extract to a const enum/);
  });

  it("doesn't flag a single-use string comparison", async () => {
    writeFileSync(join(dir, "src/once.ts"), `function f(x: string) { return x === "hello"; }`);
    const r = await run({ cwd: dir, ruleIds: ["spine/enum-over-string"] });
    expect(r.errorCount).toBe(0);
    expect(r.warningCount).toBe(0);
  });

  it("doesn't flag typeof checks — their strings are JS type tags, not domain values", async () => {
    writeFileSync(
      join(dir, "src/guards.ts"),
      `
export const onServer = () => typeof window === "undefined";
export const hasDocument = () => typeof document !== "undefined";
export const isStr = (v: unknown) => typeof v === "string";
export const isStr2 = (v: unknown) => "string" === typeof v;
`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/enum-over-string"] });
    expect(r.warningCount).toBe(0);
  });

  it("doesn't flag Pick/Omit key lists — they name properties, not domain values", async () => {
    writeFileSync(
      join(dir, "src/keys.ts"),
      `
type User = { id: string; email: string; name: string };
export type Slim = Pick<User, "id" | "email">;
export type Rest = Omit<User, "id" | "email">;
`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/enum-over-string"] });
    expect(r.errorCount).toBe(0);
  });

  it("still flags a literal union nested inside a Pick/Omit type argument", async () => {
    writeFileSync(
      join(dir, "src/nested.ts"),
      `export type T = Omit<{ role: "admin" | "user" }, "id" | "email">;`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/enum-over-string"] });
    expect(r.errorCount).toBe(1);
  });
});
