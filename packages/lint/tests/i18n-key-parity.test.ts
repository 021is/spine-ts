import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "../src/runner.js";

describe("spine/i18n-key-parity", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spine-lint-"));
    mkdirSync(join(dir, "src/i18n"), { recursive: true });
    mkdirSync(join(dir, "src"), { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("flags keys missing in some catalogs", async () => {
    writeFileSync(
      join(dir, "src/i18n/en.json"),
      JSON.stringify({ namespaces: { auth: { "signin.title": { other: "Sign in" } } } }),
    );
    writeFileSync(
      join(dir, "src/i18n/de.json"),
      JSON.stringify({ namespaces: { auth: { "signin.title": { other: "Anmelden" } } } }),
    );
    writeFileSync(
      join(dir, "src/usage.tsx"),
      `
function f(t: (k: string) => string) {
  return t("auth.signin.title") + t("auth.welcome.missing");
}
`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/i18n-key-parity"] });
    expect(r.errorCount).toBe(1);
    expect(r.violations[0]?.message).toMatch(/auth\.welcome\.missing/);
  });

  it("passes when every key is in every catalog", async () => {
    writeFileSync(
      join(dir, "src/i18n/en.json"),
      JSON.stringify({ namespaces: { auth: { "signin.title": { other: "Sign in" } } } }),
    );
    writeFileSync(
      join(dir, "src/i18n/de.json"),
      JSON.stringify({ namespaces: { auth: { "signin.title": { other: "Anmelden" } } } }),
    );
    writeFileSync(
      join(dir, "src/usage.ts"),
      `function f(t: (k: string) => string) { return t("auth.signin.title"); }`,
    );
    const r = await run({ cwd: dir, ruleIds: ["spine/i18n-key-parity"] });
    expect(r.errorCount).toBe(0);
  });
});
