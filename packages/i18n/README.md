# @021.is/spine-i18n

Hexagonal i18n: domain + ports + R2/fs/memory adapters + React + server runtime. CLDR plural forms via `Intl.PluralRules`. Modeled on a proven Kotlin locale library.

## Catalog format

```json
{
  "namespaces": {
    "auth": {
      "signin.title": { "other": "Sign in" },
      "messages.unread": { "one": "1 message", "other": "{count} messages" }
    }
  }
}
```

One JSON file per locale at `src/i18n/<bcp47>.json` (e.g., `en.json`, `de.json`, `pt-BR.json`).

## Use — server (Next RSC, metadata, JSON-LD)

```ts
import { getServerLocaleRuntime } from "@021.is/spine-i18n/server";
import { makeFsCatalogStore } from "@021.is/spine-i18n/fs";

const store = makeFsCatalogStore("./src/i18n");
const runtime = await getServerLocaleRuntime(store, "de", "en");

runtime.t("auth.signin.title");                      // "Anmelden"
runtime.t("auth.messages.unread", { count: 1 });     // "1 message" (uses 'one' form)
runtime.fmtNumber(1234.5);                            // "1.234,5" (German locale)
runtime.fmtCurrency(99, "EUR");                       // "99,00 €"
runtime.fmtDate(new Date(), { dateStyle: "long" });   // "30. Mai 2026"
```

## Use — React client

```tsx
import { LocaleProvider, useT } from "@021.is/spine-i18n/react";

<LocaleProvider initial={runtime}>
  <App />
</LocaleProvider>

function SignInButton() {
  const t = useT();
  return <button>{t("auth.signin.title")}</button>;
}
```

## Locale negotiation

```ts
import { negotiateLocale, makeLocale } from "@021.is/spine-i18n";

const locale = negotiateLocale({
  urlLocale: "de",                                // 1st priority
  cookieLocale: cookies.get("locale"),            // 2nd
  acceptLanguage: req.headers.get("accept-language"), // 3rd
  supported: [makeLocale("en"), makeLocale("de"), makeLocale("pt-BR")],
  fallback: makeLocale("en"),
});
```

## Catalog stores

| | Use | Subpath |
|---|---|---|
| `makeR2CatalogStore` | Production — R2 is the source of truth, shared across all consumer apps | `@021.is/spine-i18n/r2` |
| `makeFsCatalogStore` | Dev mode, CI tests | `@021.is/spine-i18n/fs` |
| `makeMemoryCatalogStore` | Unit tests, in-process embedded use | `@021.is/spine-i18n` |

## Key parity (mandatory)

The `spine/i18n-key-parity` rule in `@021.is/spine-lint` enforces that every `t("namespace.key")` call exists in EVERY catalog loaded under `src/i18n/`. Prevents the silent production bug where one language renders the raw key text.
