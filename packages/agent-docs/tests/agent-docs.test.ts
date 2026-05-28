import { describe, expect, it } from "vitest";
import {
  buildLlmsFullTxt,
  buildLlmsTxt,
  callout,
  code,
  type DocsCatalog,
  h2,
  ol,
  p,
  renderMarkdown,
  tabs,
  ul,
} from "../src/index";
import { llmsFullRoute, llmsTxtRoute, markdownRoute } from "../src/next";

const cat: DocsCatalog = {
  slug: "install",
  title: "Install the SDK",
  description: "One line to install.",
  body: [
    h2("Steps"),
    p("Do this."),
    ul(["alpha", "beta"]),
    ol(["one", "two"]),
    code("ts", "const x = 1;", "x.ts"),
    callout("info", "Heads up."),
    tabs([{ label: "bun", language: "bash", source: "bun add @021.is/agent-docs" }], "Install"),
  ],
};

describe("renderMarkdown", () => {
  it("leads with H1 + blockquote", () => {
    const md = renderMarkdown(cat);
    expect(md.startsWith("# Install the SDK\n")).toBe(true);
    expect(md).toContain("> One line to install.");
  });

  it("emits ordered + unordered lists distinctly", () => {
    const md = renderMarkdown(cat);
    expect(md).toContain("- alpha");
    expect(md).toContain("1. one");
  });

  it("ends with a single trailing newline", () => {
    const md = renderMarkdown(cat);
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });
});

describe("buildLlmsTxt", () => {
  it("lists each catalog under ## Docs and adds the openapi optional", () => {
    const out = buildLlmsTxt({
      name: "my-app",
      tagline: "Identity, kept in Europe.",
      siteUrl: "https://example.com",
      catalogs: [cat],
      openapi: { yamlUrl: "https://example.com/openapi.yaml" },
    });
    expect(out.startsWith("# my-app")).toBe(true);
    expect(out).toContain("https://example.com/docs/install.md");
    expect(out).toContain("https://example.com/openapi.yaml");
    expect(out).toContain("https://example.com/llms-full.txt");
  });
});

describe("buildLlmsFullTxt", () => {
  it("joins catalogs with a separator", () => {
    const full = buildLlmsFullTxt([cat, { ...cat, slug: "agents", title: "Agents" }]);
    expect(full).toContain("# Install the SDK");
    expect(full).toContain("# Agents");
    expect(full).toMatch(/\n---\n/);
  });
});

describe("next handlers", () => {
  it("markdownRoute returns text/markdown response", async () => {
    const handler = markdownRoute(cat);
    const res = handler();
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(await res.text()).toContain("# Install the SDK");
  });

  it("llmsTxtRoute returns text/plain response", async () => {
    const handler = llmsTxtRoute({
      name: "my-app",
      tagline: "x",
      siteUrl: "https://example.com",
      catalogs: [cat],
    });
    const res = handler();
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toContain("# my-app");
  });

  it("llmsFullRoute returns text/plain response", async () => {
    const handler = llmsFullRoute([cat]);
    const res = handler();
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toContain("# Install the SDK");
  });
});
