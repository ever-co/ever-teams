#!/bin/sh
# Publishes the container's runtime configuration to a static bundle, before nginx starts.
#
# The images that use this script (ever-teams-example-vite, ever-teams-storybook) are pure static
# bundles: Vite freezes every `import.meta.env.*` into the JS at build time and there is no server to
# read `process.env` per request. So the values are written to /runtime-config.js, which the page
# loads BEFORE its own bundle — the same idea as the web app's inline <RuntimeEnvScript>
# (apps/web/core/components/providers/runtime-env-provider.tsx), minus the server.
#
# nginx:alpine's stock entrypoint runs every /docker-entrypoint.d/*.sh in sorted order, so this file
# is installed as 40-runtime-config.sh and needs no ENTRYPOINT/CMD override.
#
# RUNTIME_ENV_KEYS (set by each Dockerfile) lists the names that may be published. A name that is
# unset or empty in the container environment is left out, so the app's build-time fallback applies.
set -eu

RUNTIME_CONFIG_PATH="${RUNTIME_CONFIG_PATH:-/usr/share/nginx/html/runtime-config.js}"
RUNTIME_ENV_KEYS="${RUNTIME_ENV_KEYS:-}"

{
	printf 'self.__EVER_TEAMS_RUNTIME_ENV__={'
	separator=''
	for name in $RUNTIME_ENV_KEYS; do
		eval "value=\${$name:-}"
		[ -n "$value" ] || continue
		escaped=$(printf '%s' "$value" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
		printf '%s"%s":"%s"' "$separator" "$name" "$escaped"
		separator=','
	done
	printf '};\n'
} > "$RUNTIME_CONFIG_PATH"
