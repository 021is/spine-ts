#!/usr/bin/env node
import { resolve } from "node:path";
import { cac } from "cac";
import kleur from "kleur";
import { ALL_RULES, run } from "./runner.js";
import { SEVERITY } from "./types.js";

const cli = cac("spine-lint");

cli
  .command("[...globs]", "Run Spine custom lint checks on TS/TSX files")
  .option("--cwd <path>", "Repo root", { default: "." })
  .option("--rule <id>", "Run only specific rule(s); repeatable")
  .option("--github", "Emit GitHub Actions annotations")
  .option("--list-rules", "List all available rules and exit")
  .action(async (globs: string[], opts: { cwd: string; rule?: string | string[]; github?: boolean; listRules?: boolean }) => {
    if (opts.listRules) {
      for (const r of ALL_RULES) {
        console.log(kleur.bold(r.id));
        console.log(`  ${r.description}`);
      }
      return;
    }

    const ruleIds = opts.rule ? (Array.isArray(opts.rule) ? opts.rule : [opts.rule]) : undefined;
    const result = await run({
      cwd: resolve(opts.cwd),
      ruleIds,
      globs: globs.length > 0 ? globs : undefined,
      githubAnnotations: opts.github,
    });

    if (!opts.github) {
      for (const v of result.violations) {
        const tag = v.severity === SEVERITY.ERROR ? kleur.red("✗") : kleur.yellow("!");
        console.log(`${tag} ${v.file}:${v.line}:${v.column} ${kleur.dim(`[${v.ruleId}]`)} ${v.message}`);
        if (v.hint) console.log(`    ${kleur.dim(`→ ${v.hint}`)}`);
      }
    }
    console.log("");
    console.log(
      `${kleur.dim(`Scanned ${result.filesScanned} files. ${result.errorCount} error(s), ${result.warningCount} warning(s).`)}`,
    );
    process.exit(result.errorCount > 0 ? 1 : 0);
  });

cli.help();
cli.version("0.2.0");
cli.parse();
