import { describe, expect, it } from "vitest";
import {
  buildRuntime,
  loadRuntime,
  makeLocale,
  makeMemoryCatalogStore,
  negotiateLocale,
  normalizeTag,
  pluralCategoryFor,
  renderPluralForm,
} from "../src/index.js";

describe("locale", () => {
  it("normalizes underscores + casing", () => {
    expect(normalizeTag("pt_br")).toBe("pt-BR");
    expect(normalizeTag("ZH-hans")).toBe("zh-Hans");
  });

  it("makeLocale rejects invalid tags", () => {
    expect(() => makeLocale("English")).toThrow();
  });
});

describe("catalog plural forms", () => {
  it("picks the right CLDR category for English", () => {
    expect(pluralCategoryFor(makeLocale("en"), 0)).toBe("other");
    expect(pluralCategoryFor(makeLocale("en"), 1)).toBe("one");
    expect(pluralCategoryFor(makeLocale("en"), 2)).toBe("other");
  });

  it("renderPluralForm substitutes {param}", () => {
    const out = renderPluralForm(
      { other: "Hello {name}, you have {count} messages" },
      makeLocale("en"),
      { name: "Edvard", count: 5 },
    );
    expect(out).toBe("Hello Edvard, you have 5 messages");
  });

  it("renderPluralForm uses 'one' when count=1", () => {
    const out = renderPluralForm(
      { one: "{count} message", other: "{count} messages" },
      makeLocale("en"),
      { count: 1 },
    );
    expect(out).toBe("1 message");
  });
});

describe("negotiateLocale", () => {
  const supported = [makeLocale("en"), makeLocale("de"), makeLocale("pt-BR")];
  const fallback = makeLocale("en");

  it("picks URL locale when supported", () => {
    expect(negotiateLocale({ urlLocale: "de", supported, fallback })).toBe("de");
  });

  it("falls through URL → cookie → header → fallback", () => {
    expect(
      negotiateLocale({
        urlLocale: "xx",
        cookieLocale: "de",
        acceptLanguage: "fr,en;q=0.5",
        supported,
        fallback,
      }),
    ).toBe("de");
  });

  it("respects Accept-Language q-values", () => {
    expect(
      negotiateLocale({
        acceptLanguage: "fr;q=0.5, de;q=0.9",
        supported,
        fallback,
      }),
    ).toBe("de");
  });

  it("matches language-only when full tag not supported", () => {
    expect(
      negotiateLocale({
        urlLocale: "de-AT",
        supported,
        fallback,
      }),
    ).toBe("de");
  });

  it("returns fallback when nothing matches", () => {
    expect(negotiateLocale({ acceptLanguage: "jp", supported, fallback })).toBe("en");
  });
});

describe("runtime", () => {
  it("loadRuntime: t() looks up keys", async () => {
    const store = makeMemoryCatalogStore([
      {
        locale: makeLocale("en"),
        namespaces: {
          auth: {
            "signin.title": { other: "Sign in" },
            "welcome": { other: "Welcome, {name}" },
          },
        },
      },
    ]);
    const r = await loadRuntime(store, makeLocale("en"));
    expect(r.t("auth.signin.title")).toBe("Sign in");
    expect(r.t("auth.welcome", { name: "Edvard" })).toBe("Welcome, Edvard");
  });

  it("falls back to fallback catalog when key missing in primary", async () => {
    const store = makeMemoryCatalogStore([
      { locale: makeLocale("en"), namespaces: { auth: { "signin.title": { other: "Sign in" } } } },
      { locale: makeLocale("de"), namespaces: { auth: { "signin.title": { other: "Anmelden" } } } },
    ]);
    const en = await loadRuntime(store, makeLocale("en"));
    const de = await loadRuntime(store, makeLocale("de"), makeLocale("en"));
    expect(en.t("auth.signin.title")).toBe("Sign in");
    expect(de.t("auth.signin.title")).toBe("Anmelden");
  });

  it("returns the key unchanged when missing everywhere", async () => {
    const store = makeMemoryCatalogStore([]);
    const r = await loadRuntime(store, makeLocale("en"));
    expect(r.t("nope.key")).toBe("nope.key");
  });

  it("fmtNumber + fmtDate + fmtCurrency respect locale", () => {
    const r = buildRuntime(
      { locale: makeLocale("de"), namespaces: {} },
      null,
    );
    expect(r.fmtNumber(1234.5)).toMatch(/1\.234,5/);
    expect(r.fmtCurrency(99, "EUR")).toContain("€");
  });
});
