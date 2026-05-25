import { type Locale, makeLocale, normalizeTag } from "../domain/locale.js";

/**
 * Pick the best locale for a request, in priority order:
 *   1. Explicit URL segment (/de/...) — Edvard's preferred pattern for SEO
 *   2. Cookie (last-chosen)
 *   3. Accept-Language header
 *   4. Default
 */
export interface NegotiateInput {
  urlLocale?: string;
  cookieLocale?: string;
  acceptLanguage?: string;
  supported: Locale[];
  fallback: Locale;
}

export function negotiateLocale(input: NegotiateInput): Locale {
  const supportedSet = new Set(input.supported);
  const supportedLangs = new Map<string, Locale>();
  for (const l of input.supported) {
    const lang = l.split("-")[0] ?? "";
    if (!supportedLangs.has(lang)) supportedLangs.set(lang, l);
  }

  const tryPick = (raw: string | undefined): Locale | undefined => {
    if (!raw) return undefined;
    const norm = normalizeTag(raw);
    if (supportedSet.has(norm as Locale)) return norm as Locale;
    const lang = norm.split("-")[0] ?? "";
    return supportedLangs.get(lang);
  };

  if (input.urlLocale) {
    const p = tryPick(input.urlLocale);
    if (p) return p;
  }
  if (input.cookieLocale) {
    const p = tryPick(input.cookieLocale);
    if (p) return p;
  }
  if (input.acceptLanguage) {
    for (const entry of parseAcceptLanguage(input.acceptLanguage)) {
      const p = tryPick(entry.tag);
      if (p) return p;
    }
  }
  return makeLocale(input.fallback);
}

function parseAcceptLanguage(header: string): { tag: string; q: number }[] {
  return header
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [tag, ...rest] = p.split(";");
      const qPart = rest.find((r) => r.trim().startsWith("q="));
      const q = qPart ? Number.parseFloat(qPart.split("=")[1] ?? "1") : 1;
      return { tag: (tag ?? "").trim(), q };
    })
    .sort((a, b) => b.q - a.q);
}
