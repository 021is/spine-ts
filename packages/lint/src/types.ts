/**
 * One violation found by a rule. Severity decides whether CI blocks.
 */
export const SEVERITY = {
  ERROR: "error",
  WARNING: "warning",
} as const;
export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export interface Violation {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  column: number;
  message: string;
  hint?: string;
}

export interface RuleContext {
  filePath: string;
  source: string;
  // biome-ignore lint/suspicious/noExplicitAny: typescript-estree AST shape varies per node kind
  ast: any;
  /** Other source files in scope — for cross-file rules like i18n key parity. */
  workspace: WorkspaceContext;
  report(v: Omit<Violation, "file">): void;
}

export interface WorkspaceContext {
  /** Repo root (containing package.json). */
  root: string;
  /** Loaded i18n catalogs by locale tag — key is BCP-47, value is the flat key set. */
  i18nCatalogs: Map<string, Set<string>>;
}

export interface Rule {
  id: string;
  description: string;
  /** Glob patterns the rule applies to. Default: `["src/**\/*.ts", "src/**\/*.tsx"]`. */
  includes?: readonly string[];
  /** Glob patterns the rule skips. */
  excludes?: readonly string[];
  run(ctx: RuleContext): void;
}
