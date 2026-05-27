import type { DocsCatalog } from "./catalog";
import { renderMarkdown } from "./render-markdown";

/**
 * Inputs needed by `buildLlmsTxt` — the product-side caller wires up
 * the catalogs + their public hosting URL. The library returns the
 * fully-rendered llmstxt.org file.
 */
export type LlmsTxtConfig = {
  /** Product name (e.g. "elvix", "zeropost"). H1 of the file. */
  name: string;
  /** One-sentence pitch under the H1. Blockquote in the output. */
  tagline: string;
  /** Public origin (e.g. "https://elvix.is"). No trailing slash. */
  siteUrl: string;
  /** Catalogs to surface under the `## Docs` section. */
  catalogs: DocsCatalog[];
  /** Extra `## Optional` entries. The library adds `/llms-full.txt`
   *  + the OpenAPI links automatically when `openapi` is provided. */
  extra?: Array<{ label: string; href: string; description: string }>;
  /** Public OpenAPI surface; when set, both the YAML and the role
   *  manifest are referenced from the Optional section. */
  openapi?: { yamlUrl: string; rolesJsonUrl?: string };
};

export function buildLlmsTxt(cfg: LlmsTxtConfig): string {
  const lines: string[] = [];
  lines.push(`# ${cfg.name}`);
  lines.push("");
  lines.push(`> ${cfg.tagline}`);
  lines.push("");
  lines.push("## Docs");
  for (const cat of cfg.catalogs) {
    lines.push(`- [${cat.title}](${cfg.siteUrl}/docs/${cat.slug}.md): ${cat.description}`);
  }
  lines.push("");
  lines.push("## Optional");
  lines.push(`- [Full SDK + API source](${cfg.siteUrl}/llms-full.txt): every doc page concatenated.`);
  if (cfg.openapi?.yamlUrl) {
    lines.push(`- [OpenAPI](${cfg.openapi.yamlUrl}): machine-readable REST spec.`);
  }
  if (cfg.openapi?.rolesJsonUrl) {
    lines.push(`- [Role manifest](${cfg.openapi.rolesJsonUrl}): per-endpoint role + admin scope.`);
  }
  for (const x of cfg.extra ?? []) {
    lines.push(`- [${x.label}](${x.href}): ${x.description}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Flat concatenation of every catalog. Single fetch for agents that
 * want the entire corpus in one round-trip.
 */
export function buildLlmsFullTxt(catalogs: DocsCatalog[]): string {
  const blocks = catalogs.map((c) => renderMarkdown(c));
  return `${blocks.join("\n---\n\n").trimEnd()}\n`;
}
