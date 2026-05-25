# Releasing

How to cut a new version of every Spine-TS package.

## Versioning policy

- All 17 packages move in lockstep (same version, always). Simpler operationally; no per-package semver dance. Patch-only releases bump everything to the next patch.
- SemVer: breaking → major, feature → minor, fix → patch.
- v0.x: minor bumps are allowed to break (pre-1.0). 1.0 freezes the contract.

## Steps

1. Decide the new version (`X.Y.Z`).
2. Open a release PR:
   ```bash
   bash scripts/resolve-workspace-deps.sh <X.Y.Z>   # bumps + rewrites cross-deps
   rm bun.lock && bun install                       # regenerate lockfile
   bun run test && bun run build                    # sanity check
   ```
3. Update `CHANGELOG.md`:
   - Move items from `[Unreleased]` into a new `## [X.Y.Z] — YYYY-MM-DD` section
   - Group by Added / Changed / Fixed / Removed / Deprecated / Security
4. Commit with `chore(release): vX.Y.Z`.
5. Open PR → wait for the self-gate workflow to pass.
6. Squash-merge.
7. On main: `git pull && git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
8. The publish workflow auto-fires on the tag. Watch:
   ```bash
   gh -R 021is/spine-ts run watch --exit-status
   ```
9. Verify a consumer can install:
   ```bash
   cd /tmp && mkdir tap && cd tap && bun init -y >/dev/null
   bun add @021is/spine-errors@X.Y.Z
   ```

## Pre-tag gates (run locally before pushing the tag)

```bash
bash scripts/check-no-workspace-deps.sh   # no workspace:* in any package
bun run test                              # all tests pass
bun run build                             # all packages build
```

If any fails — STOP. Don't push the tag.

## Why we don't use Changesets / release-please yet

For 17 lockstep packages with a single maintainer, the overhead of a release-bot isn't paid back. When the team grows OR packages start moving independently, switch to Changesets (per-package version tracking + automated PR + auto-publish).

## Recovery: a broken release went out

1. **Don't unpublish.** GH Packages doesn't allow republish of the same version + downstream lockfiles already point at it.
2. Cut the next patch immediately with the fix.
3. Add a `## [X.Y.Z] — BROKEN` note in CHANGELOG explaining the issue + the patch version that fixed it.
4. Add a check or test that would have caught it; promote to the quality gate if generalizable.
