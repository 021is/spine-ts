#!/usr/bin/env node
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { cac } from "cac";
import kleur from "kleur";
import { doctor, renderReport } from "./doctor.js";
import { scaffoldNextApp } from "./scaffold.js";

const cli = cac("spine");

cli
  .command("new <name>", "Scaffold a new 021 project (next-app | library)")
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

cli.help();
cli.version("0.1.0");
cli.parse();
