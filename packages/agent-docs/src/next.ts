import type { DocsCatalog } from "./catalog";
import { type LlmsTxtConfig, buildLlmsFullTxt, buildLlmsTxt } from "./llms-txt";
import { renderMarkdown } from "./render-markdown";

const MARKDOWN_HEADERS = {
  "content-type": "text/markdown; charset=utf-8",
  "cache-control": "public, max-age=300, s-maxage=300",
};

const PLAIN_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=300, s-maxage=300",
};

/**
 * Drop-in `GET` handler for `app/docs/<slug>.md/route.ts`:
 *
 *   export const dynamic = "force-static";
 *   export const GET = markdownRoute(installCatalog);
 */
export function markdownRoute(catalog: DocsCatalog): () => Response {
  return () =>
    new Response(renderMarkdown(catalog), {
      status: 200,
      headers: { ...MARKDOWN_HEADERS, "x-agent-docs-slug": catalog.slug },
    });
}

/** `app/llms.txt/route.ts` — pass the per-product config. */
export function llmsTxtRoute(cfg: LlmsTxtConfig): () => Response {
  return () => new Response(buildLlmsTxt(cfg), { status: 200, headers: PLAIN_HEADERS });
}

/** `app/llms-full.txt/route.ts` — pass the catalog list. */
export function llmsFullRoute(catalogs: DocsCatalog[]): () => Response {
  return () => new Response(buildLlmsFullTxt(catalogs), { status: 200, headers: PLAIN_HEADERS });
}
