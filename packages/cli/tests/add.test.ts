import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { planAdd, planUpgrade } from "../src/add.js";

describe("planAdd", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spine-add-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("produces an install command for a Spine package target", () => {
    const r = planAdd(dir, "auth");
    expect(r.commands[0]).toContain("bun add @021.is/spine-auth @021.is/spine-errors");
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it("marks testing as devDep (bun add -d)", () => {
    const r = planAdd(dir, "testing");
    expect(r.commands[0]).toContain("-d ");
  });

  it("scaffolds a feature folder via feature:<name>", () => {
    const r = planAdd(dir, "feature:event");
    expect(r.filesCreated).toContain("src/feature/event/index.ts");
    expect(existsSync(join(dir, "src/feature/event/domain/Event.ts"))).toBe(true);
    expect(existsSync(join(dir, "src/feature/event/ports/EventRepo.ts"))).toBe(true);
  });

  it("rejects unknown target", () => {
    expect(() => planAdd(dir, "unknown-thing")).toThrow(/unknown target/);
  });
});

describe("planUpgrade", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spine-upg-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("bumps every @021.is/spine-* dep to the target version", () => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: {
          "@021.is/spine-errors": "^0.1.0",
          "@021.is/spine-env": "^0.2.0",
          next: "^16",
        },
        devDependencies: { "@021.is/spine-testing": "^0.2.0" },
      }),
    );
    const { changed } = planUpgrade(dir, "0.3.0");
    expect(changed.length).toBe(3);
    const after = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
    expect(after.dependencies["@021.is/spine-errors"]).toBe("^0.3.0");
    expect(after.dependencies["@021.is/spine-env"]).toBe("^0.3.0");
    expect(after.dependencies.next).toBe("^16"); // untouched
    expect(after.devDependencies["@021.is/spine-testing"]).toBe("^0.3.0");
  });

  it("returns no changes when already at target", () => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { "@021.is/spine-errors": "^0.3.0" } }),
    );
    const { changed } = planUpgrade(dir, "0.3.0");
    expect(changed).toEqual([]);
  });
});
