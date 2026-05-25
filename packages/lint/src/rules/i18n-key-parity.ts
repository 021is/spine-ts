import { type Rule, SEVERITY } from "../types.js";

/**
 * Every `t("namespace.key")` call must resolve in every locale catalog
 * loaded into the workspace (default: src/i18n/<locale>.json).
 * Misses cause runtime fallbacks; in production they cause raw key text
 * to render in foreign languages — silent UX bug.
 */
export const i18nKeyParityRule: Rule = {
  id: "spine/i18n-key-parity",
  description: 'Every t("key") call exists in every loaded locale catalog.',
  run(ctx) {
    const catalogs = ctx.workspace.i18nCatalogs;
    if (catalogs.size === 0) return;

    walk(ctx.ast, (node) => {
      if (
        node.type === "CallExpression" &&
        node.callee?.type === "Identifier" &&
        node.callee.name === "t" &&
        node.arguments?.[0]?.type === "Literal" &&
        typeof node.arguments[0].value === "string"
      ) {
        const key = node.arguments[0].value;
        const missing: string[] = [];
        for (const [locale, keys] of catalogs) {
          if (!keys.has(key)) missing.push(locale);
        }
        if (missing.length > 0) {
          const loc = node.loc?.start ?? { line: 1, column: 0 };
          ctx.report({
            ruleId: "spine/i18n-key-parity",
            severity: SEVERITY.ERROR,
            line: loc.line,
            column: loc.column,
            message: `i18n key "${key}" missing in: ${missing.join(", ")}`,
            hint: "Add the key + translation to every catalog (DeepL bulk-translate is fine).",
          });
        }
      }
    });
  },
};
function walk(node: any, visit: (n: any) => void): void {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "loc" || key === "range") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) walk(c, visit);
    } else if (child && typeof child === "object") {
      walk(child, visit);
    }
  }
}
