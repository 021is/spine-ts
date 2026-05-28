/**
 * Catalog policy + validator. Modeled on a proven Kotlin locale library's policy.json
 * concept so spine-i18n consumers can enforce key parity, plural-branch
 * completeness, no-namespace-prefix, no-empty-value, etc. in CI.
 *
 * Per-namespace rule overrides (e.g., `email.*` skips UNTRANSLATED check
 * because templates are intentionally English-only until pro translated).
 */
export const RULE_CODES = {
  MISSING_KEY: "MISSING_KEY",
  EXTRA_KEY: "EXTRA_KEY",
  MISSING_PLURAL_BRANCH: "MISSING_PLURAL_BRANCH",
  MISSING_PARAM: "MISSING_PARAM",
  UNKNOWN_PARAM: "UNKNOWN_PARAM",
  EMPTY_VALUE: "EMPTY_VALUE",
  UNTRANSLATED: "UNTRANSLATED",
  HTML_IN_VALUE: "HTML_IN_VALUE",
  NAMESPACE_PREFIX: "NAMESPACE_PREFIX",
  KEY_CASE: "KEY_CASE",
} as const;
export type RuleCode = (typeof RULE_CODES)[keyof typeof RULE_CODES];

export const RULE_LEVEL = {
  ERROR: "error",
  WARN: "warn",
  OFF: "off",
} as const;
export type RuleLevel = (typeof RULE_LEVEL)[keyof typeof RULE_LEVEL];

export interface Policy {
  $schema?: string;
  version?: number;
  /**
   * `namespaces["*"]` is the default for every namespace. Specific
   * namespaces override (e.g., `namespaces["email"]` may turn
   * UNTRANSLATED off because email templates stay English-only).
   */
  namespaces: Record<string, { rules: Partial<Record<RuleCode, RuleLevel>> }>;
}

export const DEFAULT_POLICY: Policy = {
  version: 1,
  namespaces: {
    "*": {
      rules: {
        MISSING_KEY: "error",
        EXTRA_KEY: "error",
        MISSING_PLURAL_BRANCH: "error",
        MISSING_PARAM: "error",
        UNKNOWN_PARAM: "error",
        EMPTY_VALUE: "error",
        UNTRANSLATED: "warn",
        HTML_IN_VALUE: "error",
        NAMESPACE_PREFIX: "error",
        KEY_CASE: "warn",
      },
    },
  },
};

export function resolveRule(policy: Policy, namespace: string, code: RuleCode): RuleLevel {
  const nsRule = policy.namespaces[namespace]?.rules?.[code];
  if (nsRule) return nsRule;
  const defaultRule = policy.namespaces["*"]?.rules?.[code];
  return defaultRule ?? "off";
}
