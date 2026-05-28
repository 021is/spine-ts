import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Audit a repo against STRUCTURE.md. Returns a list of issues, each with
 * a severity (error | warn) and an actionable hint.
 *
 * Categories checked:
 *   - Required root files (AGENTS.md, CLAUDE.md, README.md, tsconfig.json)
 *   - Test stack present (vitest config, @021.is/spine-testing dep)
 *   - Spine packages present (errors + auth + http for any non-trivial app)
 *   - Folder skeleton (src/feature, src/components, src/lib, prisma)
 *   - Hard rules (no raw <button> grep, etc.) — coming next pass
 */
export type Severity = "error" | "warn";
export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  hint?: string;
}

export interface DoctorInput {
  /** Repo root. */
  cwd: string;
  /** App type (controls which checks apply). Default: auto-detect. */
  type?: "next-app" | "library";
}

export interface DoctorReport {
  type: "next-app" | "library" | "unknown";
  findings: Finding[];
  /** True if zero `error`-severity findings. */
  passing: boolean;
}

export function doctor(input: DoctorInput): DoctorReport {
  const root = input.cwd;
  const findings: Finding[] = [];

  // Detect type
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) {
    return {
      type: "unknown",
      passing: false,
      findings: [
        { severity: "error", code: "no-package-json", message: "No package.json at repo root." },
      ],
    };
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const detected: "next-app" | "library" = input.type ?? (deps.next ? "next-app" : "library");

  // Required root files
  const required = ["AGENTS.md", "CLAUDE.md", "README.md", "tsconfig.json"];
  for (const f of required) {
    if (!existsSync(join(root, f))) {
      findings.push({
        severity: "error",
        code: `missing-${f.toLowerCase()}`,
        message: `${f} missing at repo root.`,
        hint: f === "CLAUDE.md" ? "Create CLAUDE.md with one line: @AGENTS.md" : `Create ${f}.`,
      });
    }
  }

  // Test stack
  if (!deps.vitest) {
    findings.push({
      severity: "error",
      code: "no-vitest",
      message: "vitest not installed.",
      hint: "bun add -d vitest @vitest/coverage-v8",
    });
  }
  if (!deps["@021.is/spine-testing"]) {
    findings.push({
      severity: "warn",
      code: "no-spine-testing",
      message: "@021.is/spine-testing not installed — DB tests will reinvent Testcontainers.",
      hint: "bun add -d @021.is/spine-testing",
    });
  }
  if (!pkg.scripts?.test) {
    findings.push({
      severity: "error",
      code: "no-test-script",
      message: "package.json has no `test` script.",
      hint: `Add: "test": "vitest run --reporter=verbose --reporter=github-actions"`,
    });
  }

  // Core packages for any non-trivial app
  if (detected === "next-app") {
    for (const want of ["@021.is/spine-errors", "@021.is/spine-env"]) {
      if (!deps[want]) {
        findings.push({
          severity: "error",
          code: `missing-${want.replace(/@021.is\//, "")}`,
          message: `${want} not installed.`,
          hint: `Required across every product. Run: bun add ${want}`,
        });
      }
    }
    // Folder skeleton
    const folders = ["src/feature", "src/components", "src/lib", "prisma"];
    for (const dir of folders) {
      if (!existsSync(join(root, dir))) {
        findings.push({
          severity: "warn",
          code: `missing-folder-${dir.replace(/\//g, "-")}`,
          message: `Folder ${dir}/ not present.`,
          hint: "See spine-ts/STRUCTURE.md — every Next app uses the same skeleton.",
        });
      }
    }
    if (!existsSync(join(root, "vitest.config.ts"))) {
      findings.push({
        severity: "warn",
        code: "no-vitest-config",
        message: "vitest.config.ts missing.",
        hint: "Use the boilerplate from spine-ts/templates/next-app/vitest.config.ts.",
      });
    }
  }

  return {
    type: detected,
    passing: findings.filter((f) => f.severity === "error").length === 0,
    findings,
  };
}

export function renderReport(report: DoctorReport): string {
  const out: string[] = [];
  out.push(`Type: ${report.type}`);
  if (report.findings.length === 0) {
    out.push("✓ All checks passed.");
    return out.join("\n");
  }
  for (const f of report.findings) {
    const tag = f.severity === "error" ? "✗" : "!";
    out.push(`${tag} [${f.code}] ${f.message}`);
    if (f.hint) out.push(`    → ${f.hint}`);
  }
  out.push("");
  out.push(
    report.passing
      ? "✓ Passing (warnings only)."
      : `✗ ${report.findings.filter((f) => f.severity === "error").length} error(s).`,
  );
  return out.join("\n");
}
