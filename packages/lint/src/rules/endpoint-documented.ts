import { type Rule, SEVERITY } from "../types.js";
import { walk } from "../walk.js";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/**
 * Every route handler must have a JSDoc block immediately above it.
 * (OpenAPI annotations work too for backends that ship swagger.)
 */
export const endpointDocumentedRule: Rule = {
  id: "spine/endpoint-documented",
  description: "Every route handler needs a JSDoc block (or OpenAPI annotations) above it.",
  includes: ["src/app/**/route.ts", "src/app/**/route.tsx"],
  run(ctx) {
    const lines = ctx.source.split("\n");
    walk(ctx.ast, (node) => {
      let methodName: string | undefined;
      let line = 0;

      if (node.type === "ExportNamedDeclaration") {
        const decl = node.declaration;
        if (
          decl?.type === "FunctionDeclaration" &&
          decl.id?.name &&
          HTTP_METHODS.has(decl.id.name)
        ) {
          methodName = decl.id.name;
          line = node.loc?.start.line ?? 1;
        } else if (decl?.type === "VariableDeclaration") {
          for (const v of decl.declarations) {
            if (v.id?.name && HTTP_METHODS.has(v.id.name)) {
              methodName = v.id.name;
              line = node.loc?.start.line ?? 1;
            }
          }
        }
      }
      if (!methodName) return;

      // Scan upward for a JSDoc opener — skip blank lines + decorators.
      let i = line - 2;
      while (i >= 0 && lines[i]?.trim() === "") i--;
      const closer = lines[i]?.trim() ?? "";
      const hasJsdoc = closer.endsWith("*/");
      if (!hasJsdoc) {
        ctx.report({
          ruleId: "spine/endpoint-documented",
          severity: SEVERITY.WARNING,
          line,
          column: 0,
          message: `Route handler ${methodName} has no JSDoc block above it.`,
          hint: "Add: /**\\n * What it does, who calls it, what it mutates.\\n */ — see knowledge/code.md §0.",
        });
      }
    });
  },
};
