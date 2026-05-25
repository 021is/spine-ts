# @021is/spine-quality

Shipping configs for the Spine quality gate. Every 021 product consumes the same set.

## Use

```json
// biome.json
{ "extends": "@021is/spine-quality/biome" }
```

```json
// tsconfig.json (Next app)
{ "extends": "@021is/spine-quality/tsconfig-next" }
```

```json
// knip.json
{ "extends": "@021is/spine-quality/knip" }
```

```js
// .dependency-cruiser.cjs
module.exports = require("@021is/spine-quality/dependency-cruiser");
```

```json
// size-limit
{ "extends": "@021is/spine-quality/size-limit" }
```

```sh
# semgrep
semgrep ci --config "$(node -p "require.resolve('@021is/spine-quality/semgrep')")"
```

## What's enforced

| | Check | Tool | Blocking |
|---|---|---|---|
| 🎨 | Biome lint (no `any`, no console, no unused imports) | biome | yes |
| 🎨 | Format | biome | yes |
| 🔍 | tsc --strict --noEmit | tsc | yes |
| 🔍 | Type coverage ≥ 99% | type-coverage | yes |
| 🧹 | Dead exports + dead deps | knip | yes |
| 🧹 | No circular deps | madge | yes |
| 🏛️ | Hexagonal layer rules (domain can't import adapters, etc.) | dependency-cruiser | yes |
| 🔒 | OWASP top-10 + Spine custom rules | semgrep | yes |
| 🏛️ | Spine custom AST (ResponseDto, enum-over-string, OpenAPI, i18n) | spine-lint | yes |
| 🔒 | High + critical vulns | npm audit | yes |
| 🧪 | Tests pass | vitest | yes |
| 🧪 | Coverage ≥ 70% lines / 60% branches | vitest | yes |
| 📦 | Bundle size ≤ 200 KB gzipped per route | size-limit | yes |

## Tweaking

If a check is genuinely wrong for your repo, override in your local config — but **document why in AGENTS.md**. Don't disable checks silently.
