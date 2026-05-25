#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { cac } from "cac";
import kleur from "kleur";
import { validateCatalogs } from "../../application/validate.js";
import type { Catalog } from "../../domain/catalog.js";
import { makeLocale } from "../../domain/locale.js";
import { DEFAULT_POLICY, type Policy } from "../../domain/policy.js";

const cli = cac("spine-i18n");

cli
  .command(
    "validate <dir>",
    "Validate every catalog under <dir> against the source locale. Exit 1 on any error.",
  )
  .option("--source <locale>", "Source/canonical locale", { default: "en" })
  .option("--policy <file>", "Path to a policy.json (overrides DEFAULT_POLICY)")
  .action((dir: string, opts: { source: string; policy?: string }) => {
    const root = resolve(dir);
    const catalogs = loadCatalogsFromDir(root);
    if (catalogs.length === 0) {
      console.error(kleur.red(`✗ no JSON catalogs found in ${root}`));
      process.exit(1);
    }
    const source = catalogs.find((c) => c.locale === opts.source);
    if (!source) {
      console.error(kleur.red(`✗ source locale "${opts.source}" not found in ${root}`));
      process.exit(1);
    }
    const targets = catalogs.filter((c) => c.locale !== opts.source);
    const policy = opts.policy ? loadPolicy(resolve(opts.policy)) : DEFAULT_POLICY;
    const result = validateCatalogs({ source, targets, policy });
    for (const f of result.findings) {
      const tag = f.level === "error" ? kleur.red("✗") : kleur.yellow("!");
      console.log(`${tag} [${f.code}] ${f.locale} ${f.namespace}${f.key ? `.${f.key}` : ""}`);
      console.log(`    ${kleur.dim(f.message)}`);
    }
    console.log("");
    console.log(
      kleur.dim(
        `Scanned ${catalogs.length} catalogs (source=${opts.source}). ${result.errorCount} error(s), ${result.warningCount} warning(s).`,
      ),
    );
    process.exit(result.passing ? 0 : 1);
  });

cli.command("list <dir>", "List every catalog locale + key count").action((dir: string) => {
  const root = resolve(dir);
  const catalogs = loadCatalogsFromDir(root);
  for (const c of catalogs.sort((a, b) => a.locale.localeCompare(b.locale))) {
    const total = Object.values(c.namespaces).reduce((sum, ns) => sum + Object.keys(ns).length, 0);
    console.log(
      `  ${kleur.bold(c.locale.padEnd(8))} ${total} keys across ${Object.keys(c.namespaces).length} namespaces`,
    );
  }
});

cli
  .command(
    "diff <source-dir> <target-dir>",
    "Compare two catalog dirs (e.g., production vs staging)",
  )
  .action((sourceDir: string, targetDir: string) => {
    const src = loadCatalogsFromDir(resolve(sourceDir));
    const tgt = loadCatalogsFromDir(resolve(targetDir));
    const srcByLocale = new Map(src.map((c) => [c.locale, c]));
    const tgtByLocale = new Map(tgt.map((c) => [c.locale, c]));
    for (const locale of new Set([...srcByLocale.keys(), ...tgtByLocale.keys()])) {
      const s = srcByLocale.get(locale);
      const t = tgtByLocale.get(locale);
      if (!s) {
        console.log(kleur.green(`+ ${locale}`));
        continue;
      }
      if (!t) {
        console.log(kleur.red(`- ${locale}`));
        continue;
      }
      const sKeys = collectKeys(s);
      const tKeys = collectKeys(t);
      const added = [...tKeys].filter((k) => !sKeys.has(k));
      const removed = [...sKeys].filter((k) => !tKeys.has(k));
      if (added.length === 0 && removed.length === 0) continue;
      console.log(kleur.bold(locale));
      for (const k of removed) console.log(kleur.red(`  - ${k}`));
      for (const k of added) console.log(kleur.green(`  + ${k}`));
    }
  });

cli.help();
cli.version("0.4.0");
cli.parse();

function loadCatalogsFromDir(dir: string): Catalog[] {
  if (!existsSync(dir)) return [];
  const out: Catalog[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    if (file === "policy.json" || file === "manifest.json" || file === "supported.json") continue;
    const tag = file.replace(/\.json$/, "");
    const json = JSON.parse(readFileSync(join(dir, file), "utf-8")) as Omit<Catalog, "locale">;
    out.push({ ...json, locale: makeLocale(tag) });
  }
  return out;
}

function loadPolicy(path: string): Policy {
  return JSON.parse(readFileSync(path, "utf-8")) as Policy;
}

function collectKeys(c: Catalog): Set<string> {
  const out = new Set<string>();
  for (const [ns, entries] of Object.entries(c.namespaces)) {
    for (const k of Object.keys(entries)) out.add(`${ns}.${k}`);
  }
  return out;
}
