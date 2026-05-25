/**
 * A Locale is a BCP-47 tag (`en`, `de`, `pt-BR`). Subtags case-normalized.
 */
export type Locale = string & { readonly __locale: unique symbol };

const TAG = /^[a-z]{2,3}(-[A-Z][a-zA-Z]{1,3})?(-[A-Z]{2}|-\d{3})?$/;

export function makeLocale(tag: string): Locale {
  const norm = normalizeTag(tag);
  if (!TAG.test(norm)) throw new Error(`[spine-i18n] invalid BCP-47 locale tag: ${tag}`);
  return norm as Locale;
}

export function normalizeTag(tag: string): string {
  const parts = tag.replace(/_/g, "-").split("-");
  if (parts.length === 0) return tag;
  const [lang, ...rest] = parts;
  const out = [(lang ?? "").toLowerCase()];
  for (const p of rest) {
    if (p.length === 2) out.push(p.toUpperCase());
    else if (p.length === 4) out.push((p[0] ?? "").toUpperCase() + p.slice(1).toLowerCase());
    else if (p.length === 3 && /^\d+$/.test(p)) out.push(p);
    else out.push(p.toLowerCase());
  }
  return out.join("-");
}

export function languageOf(locale: Locale): string {
  return locale.split("-")[0] ?? "";
}
