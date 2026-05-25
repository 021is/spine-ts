#!/usr/bin/env bash
set -euo pipefail
# Bump every packages/*/package.json to a new version AND rewrite every
# cross-package dep ("@021is/spine-*") to "^<new-version>". Use before
# tagging a release. Handles both "workspace:*" and prior version specs.
NEW="${1:?usage: resolve-workspace-deps.sh <new-version>}"

python3 - <<PY
import json, re
from pathlib import Path
NEW = "${NEW}"
spine_re = re.compile(r"^@021is/spine[-]?")
for d in Path("packages").iterdir():
    if not d.is_dir():
        continue
    p = d / "package.json"
    if not p.exists():
        continue
    data = json.loads(p.read_text())
    data["version"] = NEW
    for field in ("dependencies", "peerDependencies"):
        deps = data.get(field, {})
        for dep_name in list(deps):
            if spine_re.match(dep_name):
                deps[dep_name] = f"^{NEW}"
    p.write_text(json.dumps(data, indent=2) + "\n")
    print(f"  {data['name']:30s} → {NEW}")
PY
echo "✓ bumped all packages to ${NEW} + resolved cross-deps"
