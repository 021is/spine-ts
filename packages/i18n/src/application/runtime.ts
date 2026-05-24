import { emptyCatalog, renderPluralForm, type Catalog } from "../domain/catalog.js";
import type { Locale } from "../domain/locale.js";
import type { CatalogStore } from "../ports/catalog-store.js";

/**
 * The Runtime is what consumers call `t("key")` on. Holds the loaded
 * catalog + the locale + format helpers.
 *
 * Build one via `loadRuntime(store, locale, fallback)`. Both React's
 * `useT()` and server's `getServerLocaleRuntime()` are thin layers above.
 */
export interface Runtime {
  locale: Locale;
  /** Translate a flat-namespaced key (`auth.signin.title`). */
  t(key: string, params?: Record<string, string | number>): string;
  /** Format a number with locale-aware separators. */
  fmtNumber(value: number, opts?: Intl.NumberFormatOptions): string;
  /** Format a Date with locale-aware patterns. */
  fmtDate(value: Date | number | string, opts?: Intl.DateTimeFormatOptions): string;
  /** Format a currency amount. */
  fmtCurrency(value: number, currency: string): string;
}

export async function loadRuntime(
  store: CatalogStore,
  locale: Locale,
  fallback?: Locale,
): Promise<Runtime> {
  const primary = (await store.load(locale)) ?? emptyCatalog(locale);
  const fb = fallback && fallback !== locale ? await store.load(fallback) : null;
  return buildRuntime(primary, fb ?? null);
}

export function buildRuntime(primary: Catalog, fallback: Catalog | null): Runtime {
  const locale = primary.locale;
  const numberFmtCache = new Map<string, Intl.NumberFormat>();
  const dateFmtCache = new Map<string, Intl.DateTimeFormat>();

  return {
    locale,
    t(key, params) {
      const [ns, ...rest] = key.split(".");
      if (!ns || rest.length === 0) return key;
      const subKey = rest.join(".");
      const forms = primary.namespaces[ns]?.[subKey] ?? fallback?.namespaces[ns]?.[subKey];
      if (!forms) return key;
      return renderPluralForm(forms, locale, params);
    },
    fmtNumber(value, opts) {
      const cacheKey = JSON.stringify(opts ?? {});
      let f = numberFmtCache.get(cacheKey);
      if (!f) {
        f = new Intl.NumberFormat(locale, opts);
        numberFmtCache.set(cacheKey, f);
      }
      return f.format(value);
    },
    fmtDate(value, opts) {
      const cacheKey = JSON.stringify(opts ?? {});
      let f = dateFmtCache.get(cacheKey);
      if (!f) {
        f = new Intl.DateTimeFormat(locale, opts);
        dateFmtCache.set(cacheKey, f);
      }
      return f.format(new Date(value));
    },
    fmtCurrency(value, currency) {
      return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
    },
  };
}
