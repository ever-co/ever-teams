#!/usr/bin/env bash
# Lists the processes listening on the given TCP ports and, with --stop, ends them. Linux only: it reads /proc, so it
# needs none of lsof, ss or fuser, which the in-cluster runner image (ARC toolchain) does not have. Elsewhere it says
# so and exits 0.
#
#   bash apps/web/playwright/scripts/port-listeners.sh [--stop] 3030 3988 3989 3990 3991
#
# CI runs it after the Playwright route suites (.github/workflows/web.before-merge.yml). In-cluster (ci-builds) every
# job of that file runs in one pod, one after another, so a server a suite left behind would still hold port 3030 or
# the mock's ports when the Cypress job starts its own servers there.
# cspell:ignore cmdline
set -u

stop=false
if [ "${1:-}" = "--stop" ]; then
	stop=true
	shift
fi
if [ "$#" -eq 0 ]; then
	echo "usage: port-listeners.sh [--stop] <port>..." >&2
	exit 2
fi
if [ ! -r /proc/net/tcp ]; then
	echo "port-listeners: no /proc/net/tcp on this system, nothing checked"
	exit 0
fi

# "<port> <pid> <command line>" per listening socket. /proc/net/tcp{,6} name a socket by inode; the process holding it
# has a /proc/<pid>/fd entry that links to socket:[<inode>]. State 0A is LISTEN.
listeners() {
	local port suffix inode fd pid
	for port in "$@"; do
		suffix=$(printf ':%04X' "$port")
		for inode in $(awk -v p="$suffix" 'FNR > 1 && $4 == "0A" && substr($2, length($2) - 4) == p { print $10 }' /proc/net/tcp /proc/net/tcp6 2>/dev/null); do
			for fd in /proc/[0-9]*/fd/*; do
				if [ "$(readlink "$fd" 2>/dev/null)" = "socket:[$inode]" ]; then
					pid=${fd#/proc/}
					pid=${pid%%/*}
					echo "$port $pid $(tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null | cut -c1-200)"
				fi
			done
		done
	done | sort -u
}

found=$(listeners "$@")
if [ -z "$found" ]; then
	echo "Nothing listens on port(s) $*"
	exit 0
fi
echo "Listening on port(s) $*:"
echo "$found"
if [ "$stop" != true ]; then
	exit 0
fi

pids=$(echo "$found" | awk '{ print $2 }' | sort -u | tr '\n' ' ')
echo "::warning::Stopping servers left on port(s) $*: pid $pids"
# shellcheck disable=SC2086
kill $pids 2>/dev/null
for _ in $(seq 1 10); do
	if [ -z "$(listeners "$@")" ]; then
		exit 0
	fi
	sleep 1
done
# shellcheck disable=SC2086
kill -9 $pids 2>/dev/null
sleep 1
left=$(listeners "$@")
if [ -n "$left" ]; then
	echo "::error::Port(s) still held after SIGKILL:"
	echo "$left"
	exit 1
fi
