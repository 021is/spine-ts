#!/usr/bin/env bash
set -euo pipefail
# Install Spine pre-commit hooks into the current repo.
#
# Usage:  bash <(curl -fsSL https://raw.githubusercontent.com/021is/spine-ts/main/scripts/install-hooks.sh)
#         or copy this file into your repo's scripts/ and run `bash scripts/install-hooks.sh`.
#
# Wires:
#   - husky for git hooks
#   - lint-staged for incremental linting on staged files only (fast)
#   - pre-commit: biome check + spine-lint on staged TS/TSX
#   - pre-push: bun run typecheck (catches type errors before push)
#
# Idempotent — re-running just refreshes the hooks.

if [ ! -f package.json ]; then
  echo "✗ no package.json in cwd — run from repo root"
  exit 1
fi

echo "→ installing husky + lint-staged"
bun add -d husky lint-staged

echo "→ husky init"
bunx husky init

cat > .husky/pre-commit <<'HOOK'
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"
bunx lint-staged
HOOK
chmod +x .husky/pre-commit

cat > .husky/pre-push <<'HOOK'
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"
echo "→ tsc --noEmit (might take a minute)"
bun run typecheck
HOOK
chmod +x .husky/pre-push

echo "→ writing lint-staged config to package.json"
node <<'JS'
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf-8"));
p["lint-staged"] = {
  "*.{ts,tsx}": [
    "biome check --write --no-errors-on-unmatched",
    "bunx spine-lint --rule spine/enum-over-string --rule spine/no-raw-sql"
  ],
  "*.{js,jsx,json,md}": ["biome check --write --no-errors-on-unmatched"]
};
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
console.log("  ✓ package.json updated");
JS

echo
echo "✓ Spine pre-commit hooks installed."
echo
echo "Try it:"
echo "  echo 'const x: \"a\" | \"b\" = \"a\";' > /tmp/test.ts && git add /tmp/test.ts"
echo "  git commit -m 'test' --dry-run"
