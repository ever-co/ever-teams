#!/usr/bin/env bash
# Bootstrap a new Spec Kit feature directory under docs/specs/features/.
#
# Usage: .specify/scripts/bash/create-new-feature.sh <slug> "Feature Title"
#
# Creates docs/specs/features/<slug>/ with:
#   - spec.md   (from .specify/templates/spec-template.md)
#   - plan.md   (from .specify/templates/plan-template.md)
#   - tasks.md  (from .specify/templates/tasks-template.md)
# Each is pre-populated with the slug, title, and today's date.

set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <slug> [\"Feature Title\"]" >&2
    exit 1
fi

slug="$1"
title="${2:-$slug}"

if [[ ! "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "The slug is lowercase letters, digits and single hyphens (e.g. task-views): $slug" >&2
    exit 1
fi

# A sed replacement takes `\`, `&` and the delimiter literally only when escaped: "Import/Export" and
# "Chat & Docs" are ordinary titles.
escape_replacement() {
    printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
templates="$repo_root/.specify/templates"
out_dir="$repo_root/docs/specs/features/$slug"

if [[ ! -d "$templates" ]]; then
    echo "Cannot find $templates — run from inside the monorepo." >&2
    exit 1
fi

if [[ -d "$out_dir" ]]; then
    echo "Feature directory already exists: $out_dir" >&2
    exit 1
fi

today=$(date -u +%Y-%m-%d)
title_replacement=$(escape_replacement "$title")

for kind in spec plan tasks; do
    if [[ ! -f "$templates/${kind}-template.md" ]]; then
        echo "Missing template: $templates/${kind}-template.md" >&2
        exit 1
    fi
done

mkdir -p "$out_dir"

for kind in spec plan tasks; do
    src="$templates/${kind}-template.md"
    dst="$out_dir/${kind}.md"
    sed -e "s|\[FEATURE NAME\]|$title_replacement|g" \
        -e "s|\[short-slug\]|$slug|g" \
        -e "s|YYYY-MM-DD|$today|g" \
        "$src" > "$dst"
    echo "  + $dst"
done

cat <<EOF

Created Spec Kit feature directory: $out_dir

Next steps:
  1. Open spec.md and replace placeholders.
  2. Once approved, fill in plan.md.
  3. Once plan is approved, expand tasks.md.

EOF
