# @021is/spine-lint

Spine-specific AST checks that biome can't express. Runs in CI as the `spine-lint` job in the quality gate; also runs locally via `spine-lint .`.

## Rules

| Rule | Severity | What |
|---|---|---|
| `spine/enum-over-string` | error / warning | Forbids inline string-literal unions (`: "a" \| "b" \| "c"`). Warns on repeated string-literal comparisons (`x === "foo"` ≥2 times). Locked by Edvard 2026-05-25. |
| `spine/route-returns-response-dto` | error | Every Next.js route handler must go through `withErrorHandling` from `@021is/spine-errors/next` OR explicitly call `ok()` / `err()`. |
| `spine/endpoint-documented` | warning | Every route handler must have a JSDoc block above it. |
| `spine/i18n-key-parity` | error | Every `t("namespace.key")` exists in every locale catalog under `src/i18n/`. Prevents the silent UX bug where production renders raw keys in foreign locales. |
| `spine/no-raw-sql` | error | Blocks `$queryRawUnsafe` / `$executeRawUnsafe`. Use Prisma or `$queryRaw\`…\`` tagged-template. |

## CLI

```bash
spine-lint .                           # run all rules on src/**
spine-lint src/feature/event          # narrow to one path
spine-lint --rule spine/enum-over-string .
spine-lint --github .                   # emit GitHub Actions annotations
spine-lint --list-rules
```

Exit code 1 on any error-level violation. Used as a required check in the spine-quality-gate workflow.

## Disabling for a single line

```ts
// spine-lint-disable-next-line spine/no-raw-sql — needed for the pg_stat query
await prisma.$queryRawUnsafe(`SELECT * FROM pg_stat_activity`);
```

(Disables ALL rules on the next line if no rule id given.) **You must always include the WHY comment.** PR reviewers + future-you will look there first.

## Enum pattern (the rule you'll hit most)

```ts
// ❌ inline union
function setStatus(s: "active" | "inactive" | "deleted") { ... }

// ✓ const-as-object enum
export const STATUS = { ACTIVE: "active", INACTIVE: "inactive", DELETED: "deleted" } as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];

function setStatus(s: Status) { ... }
```

Why const-as-object instead of `enum`:
- Tree-shakable (TS `enum` compiles to runtime objects).
- Pure values; no class machinery.
- Plays nice with `as const` and `Object.values()`.
- Industry standard (TanStack, Next.js codebase, Vercel SDK).
