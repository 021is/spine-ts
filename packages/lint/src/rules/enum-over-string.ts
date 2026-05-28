import { type Rule, SEVERITY } from "../types.js";
import { walk } from "../walk.js";

/**
 * Flag inline string-literal unions (e.g. `: "a" | "b" | "c"`) AND
 * string-literals used in === / switch where the same literal appears
 * ≥ 2 times in the file (suggests a constant should be extracted).
 *
 * Project rule: magic strings are forbidden when
 * an enum-shaped constant would do. Use const-as-object:
 *
 *   export const STATUS = { ACTIVE: "active", INACTIVE: "inactive" } as const;
 *   export type Status = (typeof STATUS)[keyof typeof STATUS];
 */
export const enumOverStringRule: Rule = {
  id: "spine/enum-over-string",
  description: "Forbid inline string-literal unions and repeated string-literal comparisons.",
  run(ctx) {
    walk(ctx.ast, (node) => {
      if (isStringLiteralUnion(node) && countStringLiteralChildren(node) >= 2) {
        const loc = node.loc?.start ?? { line: 1, column: 0 };
        ctx.report({
          ruleId: "spine/enum-over-string",
          severity: SEVERITY.ERROR,
          line: loc.line,
          column: loc.column,
          message: "Inline string-literal union — promote to const-as-object enum.",
          hint: 'Use: const X = { A: "a", B: "b" } as const; type X = typeof X[keyof typeof X]',
        });
      }
    });

    const literalCounts = new Map<
      string,
      { count: number; firstLoc: { line: number; column: number } }
    >();
    walk(ctx.ast, (node) => {
      if (
        node.type === "BinaryExpression" &&
        (node.operator === "===" || node.operator === "!==")
      ) {
        for (const side of [node.left, node.right]) {
          if (
            side?.type === "Literal" &&
            typeof side.value === "string" &&
            side.value.length >= 2
          ) {
            const k = side.value;
            const prev = literalCounts.get(k);
            const loc = side.loc?.start ?? { line: 1, column: 0 };
            if (prev) {
              prev.count += 1;
            } else {
              literalCounts.set(k, { count: 1, firstLoc: loc });
            }
          }
        }
      }
      if (
        node.type === "SwitchCase" &&
        node.test?.type === "Literal" &&
        typeof node.test.value === "string"
      ) {
        const k = node.test.value;
        const prev = literalCounts.get(k);
        const loc = node.test.loc?.start ?? { line: 1, column: 0 };
        if (prev) prev.count += 1;
        else literalCounts.set(k, { count: 1, firstLoc: loc });
      }
    });

    for (const [literal, info] of literalCounts) {
      if (info.count >= 2) {
        ctx.report({
          ruleId: "spine/enum-over-string",
          severity: SEVERITY.WARNING,
          line: info.firstLoc.line,
          column: info.firstLoc.column,
          message: `String literal "${literal}" used in ${info.count} comparisons — extract to a const enum.`,
          hint: "Define once at the top of the file or in src/lib/<feature>-enums.ts.",
        });
      }
    }
  },
};

function isStringLiteralUnion(node: any): boolean {
  if (node.type !== "TSUnionType") return false;
  return node.types.every(
    (t: any) =>
      t.type === "TSLiteralType" &&
      t.literal?.type === "Literal" &&
      typeof t.literal.value === "string",
  );
}

function countStringLiteralChildren(node: any): number {
  if (node.type !== "TSUnionType") return 0;
  return node.types.length;
}
