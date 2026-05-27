/**
 * Docs catalog primitives — the single-source-of-truth shape every
 * `/docs/*` surface reads from.
 *
 * One catalog object describes one page. The same object feeds:
 *   - the JSX page (rendered by `<DocsRender>`)
 *   - the `.md` route handler (rendered by `renderMarkdown`)
 *   - the `llms.txt` index entry
 *   - the `llms-full.txt` concatenation
 *
 * Adding a doc section means editing ONE file. Drift across surfaces
 * is detected by CI (drift-check regenerates llms-full and diffs).
 */

export const SectionKind = {
  HEADING: "heading",
  PARAGRAPH: "paragraph",
  LIST: "list",
  CODE: "code",
  TABS: "tabs",
  CALLOUT: "callout",
  LINK: "link",
} as const;
export type SectionKind = (typeof SectionKind)[keyof typeof SectionKind];

export const HeadingLevel = {
  H1: 1,
  H2: 2,
  H3: 3,
  H4: 4,
} as const;
export type HeadingLevel = (typeof HeadingLevel)[keyof typeof HeadingLevel];

export const CalloutTone = {
  INFO: "info",
  WARNING: "warning",
} as const;
export type CalloutTone = (typeof CalloutTone)[keyof typeof CalloutTone];

export type DocsSection =
  | { kind: typeof SectionKind.HEADING; level: HeadingLevel; text: string }
  | { kind: typeof SectionKind.PARAGRAPH; text: string }
  | { kind: typeof SectionKind.LIST; items: string[]; ordered?: boolean }
  | {
      kind: typeof SectionKind.CODE;
      language: string;
      source: string;
      filename?: string;
    }
  | {
      kind: typeof SectionKind.TABS;
      title?: string;
      tabs: Array<{ label: string; language: string; source: string; filename?: string }>;
    }
  | { kind: typeof SectionKind.CALLOUT; tone: CalloutTone; text: string }
  | { kind: typeof SectionKind.LINK; href: string; text: string };

export type DocsCatalog = {
  /** URL slug under `/docs/` (e.g. "install", "agents", "components"). */
  slug: string;
  /** H1 / `<title>`. */
  title: string;
  /** One-sentence summary for OG description + llms.txt index entry. */
  description: string;
  /** Section list, top to bottom. */
  body: DocsSection[];
  /** Meta for review-cycle tracking. Not rendered. */
  meta?: { lastReviewed: string; owner: string };
};

export type DocsCatalogModule = {
  catalog: DocsCatalog;
};

/** Convenience constructors — keep call sites readable. */
export const h1 = (text: string): DocsSection => ({ kind: SectionKind.HEADING, level: HeadingLevel.H1, text });
export const h2 = (text: string): DocsSection => ({ kind: SectionKind.HEADING, level: HeadingLevel.H2, text });
export const h3 = (text: string): DocsSection => ({ kind: SectionKind.HEADING, level: HeadingLevel.H3, text });
export const p = (text: string): DocsSection => ({ kind: SectionKind.PARAGRAPH, text });
export const ul = (items: string[]): DocsSection => ({ kind: SectionKind.LIST, items });
export const ol = (items: string[]): DocsSection => ({ kind: SectionKind.LIST, items, ordered: true });
export const code = (language: string, source: string, filename?: string): DocsSection => ({
  kind: SectionKind.CODE,
  language,
  source,
  filename,
});
export const tabs = (
  arg: Array<{ label: string; language: string; source: string; filename?: string }>,
  title?: string,
): DocsSection => ({ kind: SectionKind.TABS, title, tabs: arg });
export const callout = (tone: CalloutTone, text: string): DocsSection => ({
  kind: SectionKind.CALLOUT,
  tone,
  text,
});
