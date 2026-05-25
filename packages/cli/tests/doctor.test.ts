import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { doctor } from "../src/doctor.js";

describe("doctor", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spine-doctor-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("flags missing package.json", () => {
    const r = doctor({ cwd: dir });
    expect(r.passing).toBe(false);
    expect(r.findings[0]?.code).toBe("no-package-json");
  });

  it("flags missing required files for a next-app", () => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "x", dependencies: { next: "^16" } }),
    );
    const r = doctor({ cwd: dir });
    expect(r.type).toBe("next-app");
    const codes = r.findings.map((f) => f.code);
    expect(codes).toContain("missing-agents.md");
    expect(codes).toContain("missing-claude.md");
    expect(codes).toContain("no-vitest");
    expect(codes).toContain("no-test-script");
    expect(codes).toContain("missing-spine-errors");
    expect(codes).toContain("missing-spine-env");
    expect(r.passing).toBe(false);
  });

  it("passes (warnings only) when minimum spec met", () => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        name: "x",
        scripts: { test: "vitest run" },
        dependencies: {
          next: "^16",
          "@021is/spine-errors": "^0.1.0",
          "@021is/spine-env": "^0.1.0",
        },
        devDependencies: {
          vitest: "^2.1.0",
          "@021is/spine-testing": "^0.1.0",
        },
      }),
    );
    for (const f of ["AGENTS.md", "CLAUDE.md", "README.md", "tsconfig.json"]) {
      writeFileSync(join(dir, f), "x");
    }
    for (const d of ["src/feature", "src/components", "src/lib", "prisma"]) {
      mkdirSync(join(dir, d), { recursive: true });
    }
    writeFileSync(join(dir, "vitest.config.ts"), "export default {}");

    const r = doctor({ cwd: dir });
    const errors = r.findings.filter((f) => f.severity === "error");
    expect(errors).toEqual([]);
    expect(r.passing).toBe(true);
  });
});
