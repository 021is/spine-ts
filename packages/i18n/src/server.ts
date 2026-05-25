import { type Runtime, loadRuntime } from "./application/runtime.js";
import type { Locale } from "./domain/locale.js";
import type { CatalogStore } from "./ports/catalog-store.js";

/**
 * Server-side runtime — used in Next.js server components, route handlers,
 * generateMetadata, JSON-LD generation, etc.
 *
 *   // app/[locale]/page.tsx
 *   const runtime = await getServerLocaleRuntime(store, locale, "en");
 *   return <h1>{runtime.t("home.title")}</h1>;
 *
 * Cache per-request; don't keep a process-wide singleton because the
 * locale changes per request.
 */
export async function getServerLocaleRuntime(
  store: CatalogStore,
  locale: Locale,
  fallback?: Locale,
): Promise<Runtime> {
  return loadRuntime(store, locale, fallback);
}
