import type { Catalog, PluralForms } from "../domain/catalog.js";
import type { Locale } from "../domain/locale.js";
import {
  DEFAULT_POLICY,
  type Policy,
  type RuleCode,
  type RuleLevel,
  resolveRule,
} from "../domain/policy.js";

export interface Finding {
  code: RuleCode;
  level: RuleLevel;
  locale: Locale | "(all)";
  namespace: string;
  key?: string;
  message: string;
}

export interface ValidateInput {
  /** Canonical catalog — the source of truth (typically `en`). */
  source: Catalog;
  /** Other catalogs to compare against the source. */
  targets: Catalog[];
  /** Policy. Defaults to DEFAULT_POLICY (every error-level rule on). */
  policy?: Policy;
}

export interface ValidateResult {
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  passing: boolean;
}

/**
 * Validate a set of catalogs against a policy. Mirrors DC's locale-lib
 * validator. Catches every drift: missing keys, extra keys, missing
 * plural branches, empty values, HTML where it shouldn't be, etc.
 */
export function validateCatalogs(input: ValidateInput): ValidateResult {
  const policy = input.policy ?? DEFAULT_POLICY;
  const findings: Finding[] = [];
  const allNamespaces = new Set<string>(Object.keys(input.source.namespaces));
  for (const t of input.targets) for (const n of Object.keys(t.namespaces)) allNamespaces.add(n);

  // NAMESPACE_PREFIX — two namespaces where one is a strict prefix of the
  // other (e.g., "event" + "event.tabs") is ambiguous at lookup time.
  const nsList = [...allNamespaces].sort();
  for (const a of nsList) {
    for (const b of nsList) {
      if (a === b) continue;
      if (b.startsWith(`${a}.`)) {
        report(findings, policy, {
          code: "NAMESPACE_PREFIX",
          locale: "(all)",
          namespace: b,
          message: `Namespace "${b}" has prefix "${a}" — would be ambiguous at lookup time.`,
        });
      }
    }
  }

  // Per-namespace, per-key checks
  for (const ns of allNamespaces) {
    const srcKeys = Object.keys(input.source.namespaces[ns] ?? {});

    // Source-side checks (HTML, empty, key-case) on canonical catalog
    for (const key of srcKeys) {
      const forms = input.source.namespaces[ns]?.[key];
      if (forms) {
        runKeyChecks(forms, ns, key, input.source.locale, findings, policy);
      }
      if (!isCamelCaseSegments(key)) {
        report(findings, policy, {
          code: "KEY_CASE",
          locale: input.source.locale,
          namespace: ns,
          key,
          message: `Key "${key}" segments should be lowerCamelCase.`,
        });
      }
    }

    // Each target catalog vs source
    for (const target of input.targets) {
      const tgtNs = target.namespaces[ns] ?? {};
      const tgtKeys = Object.keys(tgtNs);

      // MISSING_KEY — in source but not target
      for (const key of srcKeys) {
        if (!(key in tgtNs)) {
          report(findings, policy, {
            code: "MISSING_KEY",
            locale: target.locale,
            namespace: ns,
            key,
            message: `Missing key "${ns}.${key}" in locale "${target.locale}".`,
          });
        } else {
          // Plural branches must match between source + target
          const srcForms = input.source.namespaces[ns]?.[key] as PluralForms;
          const tgtForms = tgtNs[key] as PluralForms;
          const srcBranches = pluralBranches(srcForms);
          for (const branch of srcBranches) {
            if (!(branch in tgtForms)) {
              report(findings, policy, {
                code: "MISSING_PLURAL_BRANCH",
                locale: target.locale,
                namespace: ns,
                key,
                message: `Plural branch "${branch}" missing for "${ns}.${key}" in locale "${target.locale}".`,
              });
            }
          }
          // Params present in source must be present in target value
          const srcParams = collectParams(srcForms.other);
          for (const branch of Object.keys(tgtForms) as (keyof PluralForms)[]) {
            const tgtValue = tgtForms[branch];
            if (typeof tgtValue !== "string") continue;
            const tgtParams = collectParams(tgtValue);
            for (const p of srcParams) {
              if (!tgtParams.has(p)) {
                report(findings, policy, {
                  code: "MISSING_PARAM",
                  locale: target.locale,
                  namespace: ns,
                  key,
                  message: `Param "{{${p}}}" missing from "${ns}.${key}" / ${branch} in locale "${target.locale}".`,
                });
              }
            }
            for (const p of tgtParams) {
              if (!srcParams.has(p)) {
                report(findings, policy, {
                  code: "UNKNOWN_PARAM",
                  locale: target.locale,
                  namespace: ns,
                  key,
                  message: `Param "{{${p}}}" in "${ns}.${key}" / ${branch} (${target.locale}) doesn't exist in the source locale.`,
                });
              }
            }
          }
          runKeyChecks(tgtForms, ns, key, target.locale, findings, policy);

          // UNTRANSLATED — target value identical to source
          if (tgtForms.other === srcForms.other && target.locale !== input.source.locale) {
            report(findings, policy, {
              code: "UNTRANSLATED",
              locale: target.locale,
              namespace: ns,
              key,
              message: `Value for "${ns}.${key}" in "${target.locale}" is identical to source — looks untranslated.`,
            });
          }
        }
      }

      // EXTRA_KEY — in target but not source
      for (const key of tgtKeys) {
        if (!(key in (input.source.namespaces[ns] ?? {}))) {
          report(findings, policy, {
            code: "EXTRA_KEY",
            locale: target.locale,
            namespace: ns,
            key,
            message: `Key "${ns}.${key}" exists in "${target.locale}" but not in source. Remove or add to source.`,
          });
        }
      }
    }
  }

  const errorCount = findings.filter((f) => f.level === "error").length;
  const warningCount = findings.filter((f) => f.level === "warn").length;
  return { findings, errorCount, warningCount, passing: errorCount === 0 };
}

function runKeyChecks(
  forms: PluralForms,
  ns: string,
  key: string,
  locale: Locale,
  findings: Finding[],
  policy: Policy,
): void {
  for (const branch of Object.keys(forms) as (keyof PluralForms)[]) {
    const v = forms[branch];
    if (typeof v !== "string") continue;
    if (v.trim() === "") {
      report(findings, policy, {
        code: "EMPTY_VALUE",
        locale,
        namespace: ns,
        key,
        message: `Empty value for "${ns}.${key}" / ${branch} in "${locale}".`,
      });
    }
    if (/<\s*(?:script|iframe|object|embed|style|on\w+\s*=)/i.test(v)) {
      report(findings, policy, {
        code: "HTML_IN_VALUE",
        locale,
        namespace: ns,
        key,
        message: `Suspicious HTML (script/iframe/event-handler) in "${ns}.${key}" / ${branch} in "${locale}".`,
      });
    }
  }
}

function pluralBranches(forms: PluralForms): string[] {
  return Object.keys(forms).filter(
    (k) => typeof (forms as unknown as Record<string, unknown>)[k] === "string",
  );
}

function collectParams(template: string): Set<string> {
  const out = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) out.add(m[1] ?? "");
  for (const m of template.matchAll(/\{(\w+)\}/g)) out.add(m[1] ?? "");
  return out;
}

function isCamelCaseSegments(key: string): boolean {
  return key.split(".").every((seg) => /^[a-z][a-zA-Z0-9]*$/.test(seg));
}

function report(
  findings: Finding[],
  policy: Policy,
  partial: Omit<Finding, "level">,
): void {
  const level = resolveRule(policy, partial.namespace, partial.code);
  if (level === "off") return;
  findings.push({ ...partial, level });
}
