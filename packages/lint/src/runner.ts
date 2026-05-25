import { readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import fg from "fast-glob";
import { parse } from "@typescript-eslint/typescript-estree";
import { enumOverStringRule } from "./rules/enum-over-string.js";
import { routeReturnsResponseDtoRule } from "./rules/route-returns-response-dto.js";
import { endpointDocumentedRule } from "./rules/endpoint-documented.js";
import { i18nKeyParityRule } from "./rules/i18n-key-parity.js";
import { noRawSqlRule } from "./rules/no-raw-sql.js";
import { SEVERITY, type Rule, type Violation, type WorkspaceContext } from "./types.js";

export const ALL_RULES: readonly Rule[] = [
  enumOverStringRule,
  routeReturnsResponseDtoRule,
  endpointDocumentedRule,
  i18nKeyParityRule,
  noRawSqlRule,
];

export interface RunOptions {
  cwd: string;
  ruleIds?: readonly string[];
  globs?: readonly string[];
  /** Print GitHub Actions annotation format. */
  githubAnnotations?: boolean;
}

export interface RunResult {
  violations: Violation[];
  filesScanned: number;
  errorCount: number;
  warningCount: number;
}

export async function run(opts: RunOptions): Promise<RunResult> {
  const root = opts.cwd;
  const rules = opts.ruleIds ? ALL_RULES.filter((r) => opts.ruleIds!.includes(r.id)) : ALL_RULES;
  const workspace: WorkspaceContext = {
    root,
    i18nCatalogs: loadI18nCatalogs(root),
  };

  const defaultGlobs = ["src/**/*.ts", "src/**/*.tsx"];
  const excludes = ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"];
  const globs = opts.globs ?? defaultGlobs;

  const files = await fg(globs as string[], { cwd: root, ignore: excludes, absolute: true });
  const violations: Violation[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    let ast: ReturnType<typeof parse>;
    try {
      ast = parse(source, {
        jsx: file.endsWith(".tsx"),
        loc: true,
        range: true,
        comment: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      violations.push({
        ruleId: "spine/parse-error",
        severity: SEVERITY.ERROR,
        file: relative(root, file),
        line: 1,
        column: 0,
        message: `Parse error: ${msg}`,
      });
      continue;
    }

    for (const rule of rules) {
      if (!matchesIncludes(file, rule, root)) continue;
      rule.run({
        filePath: file,
        source,
        ast,
        workspace,
        report: (v) => violations.push({ ...v, file: relative(root, file) }),
      });
    }
  }

  if (opts.githubAnnotations) {
    for (const v of violations) {
      const cmd = v.severity === SEVERITY.ERROR ? "error" : "warning";
      const safeMessage = v.message.replace(/\r?\n/g, "%0A");
      const hint = v.hint ? `%0A${v.hint.replace(/\r?\n/g, "%0A")}` : "";
      process.stdout.write(
        `::${cmd} file=${v.file},line=${v.line},col=${v.column},title=${v.ruleId}::${safeMessage}${hint}\n`,
      );
    }
  }

  return {
    violations,
    filesScanned: files.length,
    errorCount: violations.filter((v) => v.severity === SEVERITY.ERROR).length,
    warningCount: violations.filter((v) => v.severity === SEVERITY.WARNING).length,
  };
}

function loadI18nCatalogs(root: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const dir = join(root, "src/i18n");
  if (!existsSync(dir)) return map;
  const files = fg.sync("*.json", { cwd: dir, absolute: true });
  for (const f of files) {
    const locale = f.split("/").pop()!.replace(/\.json$/, "");
    try {
      const json = JSON.parse(readFileSync(f, "utf-8")) as {
        namespaces?: Record<string, Record<string, unknown>>;
      };
      const keys = new Set<string>();
      for (const [ns, entries] of Object.entries(json.namespaces ?? {})) {
        for (const k of Object.keys(entries ?? {})) keys.add(`${ns}.${k}`);
      }
      map.set(locale, keys);
    } catch {
      // ignore unreadable catalogs
    }
  }
  return map;
}

function matchesIncludes(file: string, rule: Rule, root: string): boolean {
  if (!rule.includes || rule.includes.length === 0) return true;
  const rel = relative(root, file);
  for (const glob of rule.includes) {
    if (fg.sync(glob, { cwd: root, ignore: rule.excludes as string[] }).some((m) => m === rel)) {
      return true;
    }
  }
  return false;
}
