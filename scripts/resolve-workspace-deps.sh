#!/usr/bin/env bash
set -euo pipefail
# Bump every packages/*/package.json to a new version + replace any
# "workspace:*" cross-package deps with the same new version (^X.Y.Z).
# Use before tagging a release.
#
#   ./scripts/resolve-workspace-deps.sh 0.1.2

NEW="${1:?usage: resolve-workspace-deps.sh <new-version>}"

python3 - <<PY
import json
from pathlib import Path
NEW = "${NEW}"
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
        for dep_name, dep_ver in list(deps.items()):
            if dep_ver == "workspace:*":
                deps[dep_name] = f"^{NEW}"
    p.write_text(json.dumps(data, indent=2) + "\n")
    print(f"  {data['name']:30s} → {NEW}")
PY
echo "✓ bumped all packages to ${NEW} + resolved workspace:* deps"
