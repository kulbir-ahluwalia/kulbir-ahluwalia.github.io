#!/usr/bin/env bash
# Claude Code PostToolUse hook (Edit|Write|MultiEdit): re-run the claims linter after a content edit.
# Exit 2 with the findings on stderr when the edit leaves an overclaim, so Claude sees them and fixes it.
# Exit 0 (no-op) when python3 or PyYAML is missing, or the edited file is not site content.
root="$(cd "$(dirname "$0")/../.." && pwd)"
command -v python3 >/dev/null 2>&1 || exit 0
python3 -c 'import yaml' >/dev/null 2>&1 || exit 0

file="$(python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
ti = data.get("tool_input") or {}
print(ti.get("file_path") or ti.get("path") or "")
')"
[ -n "$file" ] || exit 0

rel="$(python3 -c '
import os, sys
root, f = os.path.realpath(sys.argv[1]), os.path.realpath(sys.argv[2])
print(os.path.relpath(f, root) if f.startswith(root + os.sep) else "")
' "$root" "$file")"
[ -n "$rel" ] || exit 0

case "$rel" in
  scripts/*|.claude/*|.github/*|.githooks/*|.cursor/*|_site/*|vendor/*|node_modules/*) exit 0 ;;
  _config.yml|_data/*|_includes/*|*.html|*.md|*.markdown) ;;
  *) exit 0 ;;
esac

# a status change in publications.yml can create findings in other files, so show everything then
if [ "$rel" = "_data/publications.yml" ]; then
  out="$(cd "$root" && python3 scripts/check_claims.py --quiet 2>&1)"; rc=$?
else
  out="$(cd "$root" && python3 scripts/check_claims.py --quiet --only "$rel" 2>&1)"; rc=$?
fi
if [ "$rc" -eq 1 ]; then
  printf 'Claims check failed after editing %s (see scripts/check_claims.py for the rules):\n%s\n' "$rel" "$out" >&2
  exit 2
fi
exit 0
