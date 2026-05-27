import type { DocsCatalog, DocsSection } from "./catalog";

/**
 * Render a docs catalog as plain Markdown. Output is what we serve
 * from `/docs/<slug>.md` and concatenate into `/llms-full.txt`.
 *
 * Conventions:
 *   - The catalog's `title` becomes the leading `# Title` line.
 *   - The catalog's `description` becomes the leading `>` blockquote.
 *   - Sections render top-to-bottom in declaration order.
 *   - Tabs collapse to per-tab fenced blocks (agents prefer flat).
 */
export function renderMarkdown(catalog: DocsCatalog): string {
  const lines: string[] = [];
  lines.push(`# ${catalog.title}`);
  lines.push("");
  lines.push(`> ${catalog.description}`);
  lines.push("");
  for (const section of catalog.body) {
    lines.push(...renderSection(section));
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderSection(section: DocsSection): string[] {
  switch (section.kind) {
    case "heading":
      return [`${"#".repeat(section.level)} ${section.text}`];
    case "paragraph":
      return [section.text];
    case "list":
      return section.items.map((item, i) =>
        section.ordered ? `${i + 1}. ${item}` : `- ${item}`,
      );
    case "code": {
      const out: string[] = [];
      if (section.filename) out.push(`<!-- ${section.filename} -->`);
      out.push(`\`\`\`${section.language}`);
      out.push(section.source.replace(/\n+$/, ""));
      out.push("```");
      return out;
    }
    case "tabs": {
      const out: string[] = [];
      if (section.title) out.push(`**${section.title}**`, "");
      for (const tab of section.tabs) {
        out.push(`<!-- ${tab.label}${tab.filename ? ` · ${tab.filename}` : ""} -->`);
        out.push(`\`\`\`${tab.language}`);
        out.push(tab.source.replace(/\n+$/, ""));
        out.push("```");
        out.push("");
      }
      return out;
    }
    case "callout":
      return [`> **${section.tone === "warning" ? "Warning" : "Note"}:** ${section.text}`];
    case "link":
      return [`[${section.text}](${section.href})`];
  }
}
