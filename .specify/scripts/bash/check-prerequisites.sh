#!/usr/bin/env bash
# Check that the host has everything Spec Kit needs.
# Usage: .specify/scripts/bash/check-prerequisites.sh

set -euo pipefail

ok=true
check() {
    local cmd="$1"
    local hint="$2"
    if command -v "$cmd" >/dev/null 2>&1; then
        printf "  [ok]    %-12s %s\n" "$cmd" "$($cmd --version 2>&1 | head -n1)"
    else
        printf "  [MISS]  %-12s %s\n" "$cmd" "$hint"
        ok=false
    fi
}

echo "Checking Spec Kit prerequisites…"
check yarn "install yarn 1.x (corepack enable)"
check node "install Node.js 24+"
check git  "install Git"

# The repository needs Node.js 24 or newer (package.json engines, .nvmrc).
if command -v node >/dev/null 2>&1; then
    node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
    if (( node_major < 24 )); then
        printf "  [OLD]   %-12s %s\n" node "Node.js $(node --version) found; install Node.js 24+"
        ok=false
    fi
fi

if $ok; then
    echo
    echo "All prerequisites present."
else
    echo
    echo "Some prerequisites missing — see hints above." >&2
    exit 1
fi
