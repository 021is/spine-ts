# Changelog

All notable changes to Spine-TS packages. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), version numbers follow [SemVer](https://semver.org/).

## [Unreleased]

(empty)

## [0.3.0] — 2026-05-25

### Added
- **`@021is/spine-i18n` DC parity (partial)** — top-level `$schema` + `version` fields on `Catalog`. `{{param}}` double-brace interpolation (matches DC's contract used by DeepL bulk-translate tooling). `validateCatalogs(input, policy?)` with 10 rule codes (MISSING_KEY, EXTRA_KEY, MISSING_PLURAL_BRANCH, MISSING_PARAM, UNKNOWN_PARAM, EMPTY_VALUE, UNTRANSLATED, HTML_IN_VALUE, NAMESPACE_PREFIX, KEY_CASE). Per-namespace rule overrides. `DEFAULT_POLICY` ships with sensible defaults. Adapters reorganized to `src/adapters/driven/{r2,fs,memory}.ts` matching DC's hexagonal layout.
- **`@021is/spine-jobs` tests** — public surface lock + unreachable-NATS error path. Full Testcontainers NATS integration deferred to next release.
- **`@021is/spine-quality/vitest`** — vitest config preset (worker pool, coverage thresholds, github-actions reporter). Consumers `mergeConfig` it.
- **`@021is/spine-lint/walk`** — shared AST walker extracted (was copy-pasted in 5 rule files). DRY.

### Changed
- **`@021is/spine-telemetry`** package.json description corrected — no more "OpenTelemetry auto-setup" overclaim. OTel tracer wire-up tracked for next release.
- **`@021is/spine`** CLI README — `add` / `upgrade` commands moved from "Coming" to "Roadmap (not yet shipped)" so consumers don't try to invoke them.
- Self-gate (`.github/workflows/quality-gate.yml`) now actually passes — fixed biome formatting, unused suppressions, useTemplate, useExhaustiveDependencies. tsc gets baseUrl + paths so workspace packages resolve.

### Fixed
- Non-null assertions in `i18n/{locale,negotiate}` + `auth/verifier` replaced with `?? ""` fallbacks.

## [0.2.0] — 2026-05-25

### Added
- `@021is/spine-quality` — config preset (biome / tsc-strict / knip / dependency-cruiser hexagonal layer rules / semgrep OWASP + Spine custom / size-limit). One install gives every 021 app the same gate.
- `@021is/spine-lint` — custom AST checks biome can't express: `spine/enum-over-string`, `spine/route-returns-response-dto`, `spine/endpoint-documented`, `spine/i18n-key-parity`, `spine/no-raw-sql`. CLI: `spine-lint .` with `--github` annotation output.
- `021is/ci/.github/workflows/spine-quality-gate.yml@v1` — 10-job reusable workflow. Branch protection wires this as the required check.
- `021is/ci/.github/workflows/spine-metrics.yml@v1` — post-merge metrics push to 021-mon (Prometheus remote_write + Loki). Drives the `grafana.021.is/d/spine-quality` dashboard.
- STRUCTURE.md sections: Enum-over-string doctrine + Spine Quality Gate requirements.
- `scripts/resolve-workspace-deps.sh` — pre-tag helper that bumps version + replaces every `workspace:*` (and any prior `^x.y.z` cross-pkg dep) with `^<new>`.

### Changed
- All packages renamed from `@021/*` to `@021is/*` (matches GH Packages scope = org name requirement).
- Cross-package deps now resolve to concrete versions before publish (was leaking `workspace:*` into manifests in 0.1.0).

## [0.1.1] — 2026-05-25

### Fixed
- Cross-package deps now resolve to `^0.1.1` instead of `workspace:*` in published manifests. (0.1.0 manifests had unusable deps; consumers couldn't install i18n / auth / actions which depended on errors.)

## [0.1.0] — 2026-05-24

### Added
- Initial release of 15 packages: errors, env, testing, http, auth, telemetry, actions, ratelimit, webhooks, email, cache, jobs, i18n, query, spine (CLI).
- STRUCTURE.md folder doctrine — hexagonal + DDD + Clean Architecture + feature-focused. Same skeleton in every 021 repo.
- 114 tests passing across 17 files. tsup builds, biome lint, vitest with @vitest/coverage-v8.
- AGENTS.md + README.md + per-package README.md + per-package AGENTS.md.
- CI: PR workflow (parallel lint / typecheck / test / build). Publish workflow on tag push.

[Unreleased]: https://github.com/021is/spine-ts/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/021is/spine-ts/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/021is/spine-ts/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/021is/spine-ts/releases/tag/v0.1.0
