# Contributing to spine-ts

`@021.is/spine-*` is the shared TypeScript service doctrine for our
products. It's published public so any project — ours or yours — can
build on the same primitives.

## What we accept

- **Bug fixes** to any package's public surface.
- **Doc fixes** — typos, broken links, clearer examples.
- **New adapters** behind existing ports (e.g. a new cache/queue backend).
- **Lint rule improvements** in `@021.is/spine-lint`.

## What needs discussion first

- New packages, or new public exports on an existing package — open an
  issue before the PR. Every public surface needs an `exports` entry and
  a changeset.
- Breaking changes to a published API.

## Local setup

```bash
bun install
bun run build      # all packages
bun run test       # vitest, Testcontainers-backed
```

Tests use real backends via Testcontainers — no mocks for our own
domain. A Docker daemon is required.

## Before you open a PR

- `bun run build` and `bun run test` pass.
- Add a changeset (`bunx changeset`) describing the change — releases are
  changeset-driven.
- One package per PR where possible. Keep diffs minimal.
