import { type Rule, SEVERITY } from "../types.js";
import { walk } from "../walk.js";

/**
 * Reject `$queryRawUnsafe` / `$executeRawUnsafe` and any string-concat
 * SQL. Force callers to use Prisma's parameterized tagged-template
 * `$queryRaw\`...\`` or the type-safe Prisma client.
 */
export const noRawSqlRule: Rule = {
  id: "spine/no-raw-sql",
  description: "Block $queryRawUnsafe / $executeRawUnsafe and string-concat SQL.",
  run(ctx) {
    walk(ctx.ast, (node) => {
      if (node.type !== "CallExpression") return;
      const callee = node.callee;
      if (callee?.type === "MemberExpression" && callee.property?.type === "Identifier") {
        const name = callee.property.name;
        if (name === "$queryRawUnsafe" || name === "$executeRawUnsafe") {
          const loc = node.loc?.start ?? { line: 1, column: 0 };
          ctx.report({
            ruleId: "spine/no-raw-sql",
            severity: SEVERITY.ERROR,
            line: loc.line,
            column: loc.column,
            message: `${name} is forbidden — use the type-safe Prisma client or $queryRaw\`...\` tagged template.`,
            hint: "If you genuinely need it, add // spine-lint-disable-next-line spine/no-raw-sql with a reason.",
          });
        }
      }
    });
  },
};
