import { type Rule, SEVERITY } from "../types.js";
import { walk } from "../walk.js";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/**
 * Every Next.js route handler MUST return a ResponseDto. The cheap check:
 * the handler is either wrapped in `withErrorHandling(...)` from
 * @021is/spine-errors/next, OR its body calls `ok(...)` / `err(...)`
 * to construct a ResponseDto envelope before returning.
 *
 * Mandatory per Edvard, locked 2026-05-24.
 */
export const routeReturnsResponseDtoRule: Rule = {
  id: "spine/route-returns-response-dto",
  description: "Every route handler must return a ResponseDto (via withErrorHandling or ok/err).",
  includes: ["src/app/**/route.ts", "src/app/**/route.tsx"],
  run(ctx) {
    const source = ctx.source;
    const hasWithErrorHandling = /withErrorHandling\s*\(/.test(source);
    const hasOkOrErr =
      /\bfrom\s+["']@021is\/spine-errors(?:\/next)?["']/.test(source) &&
      /\b(ok|err)\s*\(/.test(source);

    // Find every `export (async )? function METHOD` or `export const METHOD =`
    walk(ctx.ast, (node) => {
      let methodName: string | undefined;
      let loc = { line: 1, column: 0 };

      if (node.type === "ExportNamedDeclaration") {
        const decl = node.declaration;
        if (
          decl?.type === "FunctionDeclaration" &&
          decl.id?.name &&
          HTTP_METHODS.has(decl.id.name)
        ) {
          methodName = decl.id.name;
          loc = decl.loc?.start ?? loc;
        } else if (decl?.type === "VariableDeclaration") {
          for (const v of decl.declarations) {
            if (v.id?.name && HTTP_METHODS.has(v.id.name)) {
              methodName = v.id.name;
              loc = v.loc?.start ?? loc;
            }
          }
        }
      }
      if (!methodName) return;

      if (!hasWithErrorHandling && !hasOkOrErr) {
        ctx.report({
          ruleId: "spine/route-returns-response-dto",
          severity: SEVERITY.ERROR,
          line: loc.line,
          column: loc.column,
          message: `Route handler ${methodName} doesn't go through withErrorHandling or build a ResponseDto.`,
          hint: "Wrap with withErrorHandling from @021is/spine-errors/next, or return Response.json(ok(...)) / err(...) explicitly.",
        });
      }
    });
  },
};
