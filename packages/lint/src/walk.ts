// biome-ignore lint/suspicious/noExplicitAny: typescript-estree AST is heterogeneous
type EstreeNode = any;

/**
 * Walk every node in a typescript-estree AST, calling visit on each.
 * Skips `parent`/`loc`/`range` cycle-or-position fields.
 *
 * Extracted from the 5 rule files (was copy-pasted).
 */
export function walk(node: EstreeNode, visit: (n: EstreeNode) => void): void {
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
