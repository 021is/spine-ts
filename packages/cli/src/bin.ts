#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { cac } from "cac";
import kleur from "kleur";
import { planAdd, planUpgrade } from "./add.js";
import { doctor, renderReport } from "./doctor.js";
import { scaffoldNextApp } from "./scaffold.js";

const cli = cac("spine");

cli
  .command("new <name>", "Scaffold a new project (next-app | library)")
  .option("--type <type>", "next-app | library", { default: "next-app" })
  .option("--cwd <path>", "Target directory (default: ./<name>)")
  .action((name: string, opts: { type: string; cwd?: string }) => {
    const cwd = resolve(opts.cwd ?? `./${name}`);
    if (existsSync(`${cwd}/package.json`)) {
      console.error(kleur.red(`✗ ${cwd}/package.json already exists. Refusing to overwrite.`));
      process.exit(1);
    }
    mkdirSync(cwd, { recursive: true });
    if (opts.type !== "next-app") {
      console.error(kleur.red(`✗ Type "${opts.type}" not supported yet. Only next-app for now.`));
      process.exit(1);
    }
    const result = scaffoldNextApp({ cwd, name });
    console.log(kleur.green(`✓ Scaffolded ${result.created.length} files in ${cwd}`));
    for (const f of result.created) console.log(`  + ${f}`);
    if (result.skipped.length > 0) {
      console.log(kleur.yellow(`\n! Skipped ${result.skipped.length} (already existed):`));
      for (const f of result.skipped) console.log(`  ~ ${f}`);
    }
    console.log(kleur.dim("\nNext steps:"));
    console.log(kleur.dim(`  cd ${name}`));
    console.log(kleur.dim("  bun install"));
    console.log(kleur.dim("  bun run test"));
  });

cli
  .command("doctor", "Audit current repo against STRUCTURE.md")
  .option("--cwd <path>", "Repo root", { default: "." })
  .option("--type <type>", "Force type detection (next-app | library)")
  .action((opts: { cwd: string; type?: string }) => {
    const report = doctor({
      cwd: resolve(opts.cwd),
      type: opts.type as "next-app" | "library" | undefined,
    });
    console.log(renderReport(report));
    process.exit(report.passing ? 0 : 1);
  });

cli
  .command(
    "add <target>",
    "Add a Spine package to an existing repo OR scaffold a feature folder (feature:<name>)",
  )
  .option("--cwd <path>", "Repo root", { default: "." })
  .action((target: string, opts: { cwd: string }) => {
    try {
      const result = planAdd(resolve(opts.cwd), target);
      if (result.commands.length > 0) {
        console.log(kleur.bold("Run:"));
        for (const cmd of result.commands) console.log(`  ${cmd}`);
      }
      if (result.filesCreated.length > 0) {
        console.log(kleur.green(`\n✓ Created ${result.filesCreated.length} files:`));
        for (const f of result.filesCreated) console.log(`  + ${f}`);
      }
      if (result.notes.length > 0) {
        console.log(kleur.dim("\nNext steps:"));
        for (const note of result.notes) console.log(kleur.dim(`  • ${note}`));
      }
    } catch (e) {
      console.error(kleur.red(`✗ ${e instanceof Error ? e.message : String(e)}`));
      process.exit(1);
    }
  });

cli
  .command(
    "upgrade [version]",
    "Bump every @021.is/spine-* dep in package.json to the given version (no install). Default: highest published spine-errors version.",
  )
  .option("--cwd <path>", "Repo root", { default: "." })
  .action(async (version: string | undefined, opts: { cwd: string }) => {
    let target = version;
    if (!target) {
      try {
        // Public npm — no auth needed.
        const res = await fetch("https://registry.npmjs.org/@021.is%2fspine-errors");
        const json = (await res.json()) as { "dist-tags"?: { latest?: string } };
        target = json["dist-tags"]?.latest;
      } catch {
        // fall through — handled below
      }
    }
    if (!target) {
      console.error(kleur.red("✗ no version given + couldn't fetch latest from npm"));
      process.exit(1);
    }
    const { changed } = planUpgrade(resolve(opts.cwd), target);
    if (changed.length === 0) {
      console.log(kleur.dim(`✓ Already on ^${target}`));
      return;
    }
    console.log(kleur.green(`✓ Bumped ${changed.length} packages to ^${target}:`));
    for (const c of changed) console.log(`  ${c.name}: ${c.from} → ${c.to}`);
    console.log(kleur.dim("\nNext: rm bun.lock && bun install"));
  });

cli.help();
cli.version("0.4.0");
cli.parse();
