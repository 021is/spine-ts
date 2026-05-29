import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "@typescript-eslint/typescript-estree";
import fg from "fast-glob";
import { endpointDocumentedRule } from "./rules/endpoint-documented.js";
import { enumOverStringRule } from "./rules/enum-over-string.js";
import { i18nKeyParityRule } from "./rules/i18n-key-parity.js";
import { noRawSqlRule } from "./rules/no-raw-sql.js";
import { routeReturnsResponseDtoRule } from "./rules/route-returns-response-dto.js";
import { type Rule, SEVERITY, type Violation, type WorkspaceContext } from "./types.js";

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

    // Parse disable directives from the file's comments before running rules
    // so per-violation suppression can be checked at report time. See
    // collectDisableDirectives for the supported syntax.
    const disables = collectDisableDirectives(ast);

    for (const rule of rules) {
      if (!matchesIncludes(file, rule, root)) continue;
      rule.run({
        filePath: file,
        source,
        ast,
        workspace,
        report: (v) => {
          if (isDisabled(disables, v.ruleId, v.line)) return;
          violations.push({ ...v, file: relative(root, file) });
        },
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
    const locale = f
      .split("/")
      .pop()!
      .replace(/\.json$/, "");
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

/**
 * Per-file map of suppressed (ruleId, line) pairs derived from comments.
 * Supported forms (line refers to the line bearing the comment):
 *
 *   // spine-lint-disable-line <rule-id>                 → suppress on `line`
 *   /​* spine-lint-disable-line <rule-id> *​/             → suppress on `line`
 *   // spine-lint-disable-next-line <rule-id>            → suppress on `line + 1`
 *   // spine-lint-disable-file <rule-id>                 → suppress for all lines
 *   // spine-lint-disable <rule-id>                      → block start
 *   // spine-lint-enable <rule-id>                       → block end
 *
 * Multiple rule IDs can be space- or comma-separated. Omitting the rule
 * ID disables ALL rules for the target line.
 */
interface DisableMap {
  /** ruleId → Set<lineNumber>; "*" means all rules. */
  byLine: Map<string, Set<number>>;
  /** ruleIds disabled for the whole file. "*" → all rules. */
  fileWide: Set<string>;
  /** Open ranges (ruleId → startLine) waiting for an `enable`. */
  openRanges: Array<{ ruleId: string; from: number; to: number | null }>;
}

function collectDisableDirectives(ast: {
  comments?: Array<{ value: string; loc: { start: { line: number }; end: { line: number } } }>;
}): DisableMap {
  const out: DisableMap = { byLine: new Map(), fileWide: new Set(), openRanges: [] };
  const comments = ast.comments ?? [];
  const pending = new Map<string, number>(); // ruleId → startLine for disable/enable blocks

  for (const c of comments) {
    const raw = c.value.trim();
    // Match `spine-lint-<verb>` optionally followed by rule IDs. Allow
    // a leading prefix like `LEGACY:` or `TODO:` so codemod-inserted
    // disables can carry a grep-marker without breaking suppression.
    const m = raw.match(
      /(?:^|\s)spine-lint-(disable-line|disable-next-line|disable-file|disable|enable)\b\s*([^\n]*)$/,
    );
    if (!m) continue;
    const verb = m[1]!;
    // Stop the rule-id list at `--` so trailing `-- LEGACY` style
    // markers don't get parsed as rule IDs.
    const rest = (m[2] ?? "").split(/--/)[0]!.trim();
    const ruleIds =
      rest.length === 0
        ? ["*"]
        : rest
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
    const ruleIdsClean = ruleIds.map((r) => r.replace(/[.;].*$/, "")); // strip trailing punctuation

    const startLine = c.loc.start.line;
    if (verb === "disable-line") {
      for (const id of ruleIdsClean) addLine(out, id, startLine);
    } else if (verb === "disable-next-line") {
      for (const id of ruleIdsClean) addLine(out, id, startLine + 1);
    } else if (verb === "disable-file") {
      for (const id of ruleIdsClean) out.fileWide.add(id);
    } else if (verb === "disable") {
      for (const id of ruleIdsClean) {
        if (!pending.has(id)) pending.set(id, startLine);
      }
    } else if (verb === "enable") {
      for (const id of ruleIdsClean) {
        const from = pending.get(id);
        if (from !== undefined) {
          out.openRanges.push({ ruleId: id, from, to: startLine });
          pending.delete(id);
        }
      }
    }
  }
  // Any disable without matching enable → range to EOF (Infinity).
  for (const [id, from] of pending) {
    out.openRanges.push({ ruleId: id, from, to: null });
  }
  return out;
}

function addLine(map: DisableMap, ruleId: string, line: number): void {
  let set = map.byLine.get(ruleId);
  if (!set) {
    set = new Set();
    map.byLine.set(ruleId, set);
  }
  set.add(line);
}

function isDisabled(disables: DisableMap, ruleId: string, line: number): boolean {
  if (disables.fileWide.has("*") || disables.fileWide.has(ruleId)) return true;
  const exactLines = disables.byLine.get(ruleId);
  if (exactLines?.has(line)) return true;
  const wildLines = disables.byLine.get("*");
  if (wildLines?.has(line)) return true;
  for (const r of disables.openRanges) {
    if (
      (r.ruleId === ruleId || r.ruleId === "*") &&
      line >= r.from &&
      (r.to === null || line <= r.to)
    ) {
      return true;
    }
  }
  return false;
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
