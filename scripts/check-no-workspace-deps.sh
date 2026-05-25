#!/usr/bin/env bash
set -euo pipefail
# Fail if any packages/*/package.json still has "workspace:*" in deps/peerDeps.
# Run as a CI gate before tagging — otherwise the published manifest leaks
# the workspace: protocol and consumers can't install.
found=0
for p in packages/*/package.json; do
  if grep -E '"workspace:\*"' "$p" >/dev/null; then
    echo "✗ $p has workspace:* dep — must resolve to a real version before publish"
    found=1
  fi
done
if [ "$found" -eq 1 ]; then
  echo
  echo "Fix: run scripts/resolve-workspace-deps.sh <new-version> before tagging."
  exit 1
fi
echo "✓ no workspace:* deps in any package"
