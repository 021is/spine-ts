import type { Locale } from "./locale.js";

/**
 * A Catalog is a flat-namespaced map of translation keys to plural forms.
 *
 *   { "namespaces": { "auth": { "signin.title": { "other": "Sign in" } } } }
 *
 * CLDR plural categories: zero, one, two, few, many, other (always present).
 */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

export interface PluralForms {
  other: string;
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
}

export interface Catalog {
  locale: Locale;
  /** Flat by namespace: catalog.namespaces["auth"]["signin.title"] = PluralForms */
  namespaces: Record<string, Record<string, PluralForms>>;
}

export function emptyCatalog(locale: Locale): Catalog {
  return { locale, namespaces: {} };
}

/** Pick a CLDR plural form for `n` in `locale`. */
export function pluralCategoryFor(locale: Locale, n: number): PluralCategory {
  const r = new Intl.PluralRules(locale);
  return r.select(n) as PluralCategory;
}

/** Render a PluralForms entry with `{name}`-style param substitution. */
export function renderPluralForm(
  forms: PluralForms,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  let template = forms.other;
  if (params && "count" in params && typeof params.count === "number") {
    const cat = pluralCategoryFor(locale, params.count);
    template = forms[cat] ?? forms.other;
  }
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k) => {
    const v = params[k];
    return v == null ? `{${k}}` : String(v);
  });
}
