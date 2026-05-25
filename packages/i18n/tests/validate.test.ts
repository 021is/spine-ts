import { describe, expect, it } from "vitest";
import { makeLocale, validateCatalogs } from "../src/index.js";

const en = {
  locale: makeLocale("en"),
  namespaces: {
    common: { save: { other: "Save" }, brand: { other: "Elvix" } },
    event: { attendeesCount: { one: "{{count}} attendee", other: "{{count}} attendees" } },
  },
};

describe("validateCatalogs", () => {
  it("passes when target locale matches source key shape", () => {
    const de = {
      locale: makeLocale("de"),
      namespaces: {
        common: { save: { other: "Speichern" }, brand: { other: "Elvix" } },
        event: {
          attendeesCount: { one: "{{count}} Teilnehmer", other: "{{count}} Teilnehmer" },
        },
      },
    };
    const r = validateCatalogs({ source: en, targets: [de] });
    expect(r.errorCount).toBe(0);
  });

  it("flags MISSING_KEY when target is missing a key", () => {
    const de = {
      locale: makeLocale("de"),
      namespaces: { common: { save: { other: "Speichern" } } },
    };
    const r = validateCatalogs({ source: en, targets: [de] });
    const missing = r.findings.filter((f) => f.code === "MISSING_KEY");
    expect(missing.length).toBeGreaterThan(0);
  });

  it("flags EXTRA_KEY when target has a key source doesn't", () => {
    const de = {
      locale: makeLocale("de"),
      namespaces: {
        common: { save: { other: "Speichern" }, brand: { other: "Elvix" }, foo: { other: "Bar" } },
        event: { attendeesCount: { one: "x", other: "x" } },
      },
    };
    const r = validateCatalogs({ source: en, targets: [de] });
    expect(r.findings.some((f) => f.code === "EXTRA_KEY")).toBe(true);
  });

  it("flags MISSING_PLURAL_BRANCH when 'one' missing", () => {
    const de = {
      locale: makeLocale("de"),
      namespaces: {
        common: { save: { other: "Speichern" }, brand: { other: "Elvix" } },
        event: { attendeesCount: { other: "{{count}} Teilnehmer" } },
      },
    };
    const r = validateCatalogs({ source: en, targets: [de] });
    expect(r.findings.some((f) => f.code === "MISSING_PLURAL_BRANCH")).toBe(true);
  });

  it("flags MISSING_PARAM when target drops {{count}}", () => {
    const de = {
      locale: makeLocale("de"),
      namespaces: {
        common: { save: { other: "Speichern" }, brand: { other: "Elvix" } },
        event: { attendeesCount: { one: "Teilnehmer", other: "Teilnehmer" } },
      },
    };
    const r = validateCatalogs({ source: en, targets: [de] });
    expect(r.findings.some((f) => f.code === "MISSING_PARAM")).toBe(true);
  });

  it("flags NAMESPACE_PREFIX when sibling is a prefix", () => {
    const enWithBad = {
      ...en,
      namespaces: { ...en.namespaces, "event.tabs": { summary: { other: "Summary" } } },
    };
    const r = validateCatalogs({ source: enWithBad, targets: [] });
    expect(r.findings.some((f) => f.code === "NAMESPACE_PREFIX")).toBe(true);
  });

  it("flags EMPTY_VALUE", () => {
    const enWithEmpty = {
      ...en,
      namespaces: { ...en.namespaces, common: { ...en.namespaces.common, empty: { other: "" } } },
    };
    const r = validateCatalogs({ source: enWithEmpty, targets: [] });
    expect(r.findings.some((f) => f.code === "EMPTY_VALUE")).toBe(true);
  });

  it("flags UNTRANSLATED when target value matches source", () => {
    const de = {
      locale: makeLocale("de"),
      namespaces: {
        common: { save: { other: "Save" }, brand: { other: "Elvix" } }, // brand is intentionally same; save is suspicious
        event: { attendeesCount: { one: "{{count}} attendee", other: "{{count}} attendees" } },
      },
    };
    const r = validateCatalogs({ source: en, targets: [de] });
    expect(r.findings.some((f) => f.code === "UNTRANSLATED")).toBe(true);
  });

  it("respects per-namespace rule overrides (UNTRANSLATED off for 'common.brand')", () => {
    // Default policy: UNTRANSLATED warns. Test that override turns it off.
    const de = {
      locale: makeLocale("de"),
      namespaces: {
        common: { save: { other: "Speichern" }, brand: { other: "Elvix" } },
        event: { attendeesCount: { one: "{{count}} Teilnehmer", other: "{{count}} Teilnehmer" } },
      },
    };
    const r = validateCatalogs({
      source: en,
      targets: [de],
      policy: {
        namespaces: {
          "*": { rules: { UNTRANSLATED: "warn" } },
          common: { rules: { UNTRANSLATED: "off" } },
        },
      },
    });
    const ut = r.findings.filter((f) => f.code === "UNTRANSLATED" && f.namespace === "common");
    expect(ut.length).toBe(0);
  });
});
