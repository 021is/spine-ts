import type { Catalog } from "../domain/catalog.js";
import type { Locale } from "../domain/locale.js";

/**
 * Backing storage for translation catalogs.
 * Implementations: R2 (production), filesystem (dev), in-memory (tests).
 */
export interface CatalogStore {
  /** Load the full catalog for a locale; null if not present. */
  load(locale: Locale): Promise<Catalog | null>;

  /** Save (overwrite) a catalog. */
  save(catalog: Catalog): Promise<void>;

  /** List which locales have a catalog. */
  listLocales(): Promise<Locale[]>;
}
