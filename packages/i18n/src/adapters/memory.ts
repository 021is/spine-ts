import type { Catalog } from "../domain/catalog.js";
import type { Locale } from "../domain/locale.js";
import type { CatalogStore } from "../ports/catalog-store.js";

/** In-memory CatalogStore. For tests and small embedded uses. */
export function makeMemoryCatalogStore(seed: Catalog[] = []): CatalogStore {
  const map = new Map<Locale, Catalog>();
  for (const c of seed) map.set(c.locale, c);
  return {
    async load(locale) {
      return map.get(locale) ?? null;
    },
    async save(catalog) {
      map.set(catalog.locale, catalog);
    },
    async listLocales() {
      return [...map.keys()];
    },
  };
}
