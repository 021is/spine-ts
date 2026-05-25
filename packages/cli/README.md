# @021is/spine

CLI for scaffolding 021-shaped projects and auditing existing ones.

## Install

```bash
bun add -g @021is/spine
# or
npx @021is/spine ...
```

## Commands

### `spine new <name>`

Scaffold a fresh Next.js app following the [Spine folder doctrine](../../STRUCTURE.md). Creates 19 files: full feature-folder skeleton + one example feature + Vitest/Playwright config + Prisma stub + Biome config + AGENTS.md + CLAUDE.md.

```bash
spine new my-app
cd my-app
bun install
bun run test
```

### `spine doctor`

Audit an existing repo against [STRUCTURE.md](../../STRUCTURE.md). Lists every error + warning + actionable hint.

```bash
spine doctor
# Type: next-app
# ✗ [no-vitest] vitest not installed.
#     → bun add -d vitest @vitest/coverage-v8
# ✗ [missing-spine-errors] @021is/spine-errors not installed.
#     → Required across every 021 product. Run: bun add @021is/spine-errors
# ...
```

Exit code 1 on any error. Use as a pre-merge sanity check or in CI.

## Coming

- `spine add feature <name>` — scaffold a feature folder skeleton
- `spine add testing` / `spine add auth` — add a Spine package to existing repo + wire boilerplate
- `spine upgrade` — bump all `@021is/spine-*` to latest in lockstep
