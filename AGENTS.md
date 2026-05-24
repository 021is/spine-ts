# AGENTS.md — spine-ts

The universal TypeScript service doctrine for every 021 product. Read [STRUCTURE.md](./STRUCTURE.md) before touching anything here.

## Hard rules (this repo)

- **Every package follows the canonical package skeleton** in `STRUCTURE.md` § "Spine package skeleton". `src/`, `tests/`, `package.json`, `tsconfig.json`, `README.md`, `AGENTS.md`. No exceptions.
- **Tests live in `tests/*.test.ts` mirroring `src/`.** `src/foo.ts` → `tests/foo.test.ts`. Mechanical.
- **Every public surface gets an `exports` entry** in `package.json`. Subpaths (`/next`, `/postgres`, `/jwks`) are explicit, not derived.
- **Cross-package deps go through `workspace:*`** during dev. Changesets publishes pinned ranges.
- **Workspace alias array in `vitest.config.ts`** lets tests resolve sibling packages from `src/` directly (no build step needed for test). Order matters — subpath aliases BEFORE bare package alias.

## Hard rules (for apps consuming Spine)

- **ResponseDto from every endpoint + server action.** Mandatory. No raw payloads.
- **Hexagonal per feature.** `src/feature/<f>/{domain,ports,adapters,usecase,schema,components}`. See STRUCTURE.md import-rules table.
- **Tests use Testcontainers, not mocks.** `axon/knowledge/code.md` §9 is the binding constitution.
- **No raw `<button>` / `<input>`** — always design-system primitives.

## CI conventions (for spine itself and every consumer)

- **No push to main — PR-only.** Branch protection enforces. Auto-merge on green CI.
- **Branch `preview/*` for staging** (apps that have a staging env). Apps without staging have `main` only.
- **Tests + build run in parallel** in CI. Vitest with `--reporter=github-actions` for inline check annotations.
- **Reusable workflows in `021is/ci`** (see `pr-check-node.yml`, `ssh-systemd-deploy.yml`).

## When adding a 16th package

1. `mkdir -p packages/<name>/{src,tests}`
2. Copy the package skeleton from any existing package (errors is simplest).
3. Add to root `vitest.config.ts` alias array.
4. Add to root `README.md` packages table.
5. Add to STRUCTURE.md cross-service shared libs table.
6. Write at least one test before merging.

## When in doubt

- `axon/knowledge/code.md` is the universal doctrine. Spine renders it concrete.
- `axon/knowledge/spine-ts.md` is Spine's own doctrine (next session).
- DC backend's `shared-lib` is the proven Kotlin twin; behaviour matches.
