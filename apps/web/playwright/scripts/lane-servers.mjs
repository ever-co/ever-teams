#!/usr/bin/env node
/**
 * Keep one lane's servers warm between runs.
 *
 * Playwright starts (and then stops) a config's `webServer` for every run. For a suite that runs once in CI that is
 * correct. For a lane iterating spec by spec through a night it is the dominant cost: a cold Turbopack compile of
 * this app is minutes, and measured here a 4-test lane run took 5.5 minutes of which almost all was startup. So a
 * lane starts its servers once with this script and runs with them already listening —
 * `playwright.lane.config.ts` has `reuseExistingServer: true` exactly for that.
 *
 *   export PATH="/e/nvm/.nodejs:$PATH"
 *   node apps/web/playwright/scripts/lane-servers.mjs up lane-a          # blocks, prints "ready" when both answer
 *   node apps/web/playwright/scripts/lane-servers.mjs down lane-a        # kills only that lane's ports
 *
 * It imports `laneServers` from `test-servers.ts` rather than repeating a port or an environment variable anywhere:
 * the file that Playwright uses and the file a lane starts by hand are the same source, so the two cannot drift.
 *
 * `down` refuses to touch anything that is not its own lane's port, and a lane must run it when it finishes:
 * a leftover dev server holds ~1 GB on a machine that does not have it, and the next agent inherits a server
 * started with settings that are not its own.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** `test-servers.ts` writes its `cwd` relative to the folder holding a Playwright config, which is one level above this `scripts/` folder. */
const CONFIG_DIR = resolve(HERE, '..');

const [action, laneName] = process.argv.slice(2);

if (typeof laneName !== 'string') {
	console.error('usage: lane-servers.mjs up|down|check <lane>');
	process.exit(2);
}

/**
 * `E2E_LANE` before the import, deliberately. `test-servers.ts` reads it while being imported
 * (`MOCK_ORIGIN`, `PLATFORM_ORIGIN`, `APP_ORIGIN`), and a static `import` runs before any statement in this file —
 * so with the import above and the assignment below, a hand-started lane got the *canonical* 3988 as its API
 * while its own mock sat on the lane's port. Every server-side call then answered 502 "The Gauzy API is
 * unreachable" and a whole suite went red for a reason that was not in the app. (A config run is safe from this:
 * the shell exports the variable before Playwright starts.)
 */
process.env.E2E_LANE = laneName;
/**
 * `test-servers.ts` refuses an unknown lane at import time (it would rather throw than quietly use 3030), so the
 * import is guarded: a typo in a lane name should read as a usage error, not as a stack trace.
 */
let LANE_PORTS;
let laneServers;
try {
	({ LANE_PORTS, laneServers } = await import('../test-servers.ts'));
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(2);
}

const ports = LANE_PORTS[laneName];

if (!ports) {
	console.error(`usage: lane-servers.mjs up|down|check <${Object.keys(LANE_PORTS).join('|')}>`);
	process.exit(2);
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const listening = async (port) => {
	try {
		const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) });
		return response.status > 0;
	} catch {
		return false;
	}
};

const wantedPorts = Object.values(ports);

/**
 * Which pids hold this lane's own ports, per platform — and a tool that is not on this machine is *reported*, not
 * crashed on. The first version read `netstat.stdout.split(...)` without checking the spawn, so on any Linux or
 * macOS box `down` died with a TypeError instead of saying what it tried. Windows reads `netstat -ano`, Linux
 * `ss -tlnp`, macOS (and Linux as a fallback) `lsof`, one call per port. A port is still only ever matched against
 * this lane's own list, so `down` cannot reach another lane or anything else on the machine.
 */
const pidsListeningOn = (wanted) => {
	const pids = new Set();
	const errors = [];
	const text = (command, args) => {
		const run = spawnSync(command, args, { encoding: 'utf8' });
		if (run.error || run.status !== 0) {
			errors.push(`${command}: ${run.error?.message ?? `exit ${run.status ?? `signal ${run.signal}`}`}`);
			return '';
		}
		return run.stdout ?? '';
	};

	if (process.platform === 'win32') {
		for (const line of text('netstat', ['-ano']).split(/\r?\n/)) {
			if (!line.includes('LISTENING')) continue;
			const port = line.match(/:(\d{2,5})\s/);
			if (port && wanted.includes(Number(port[1]))) pids.add(line.trim().split(/\s+/).pop());
		}
		return { pids, errors };
	}

	if (process.platform === 'linux') {
		for (const line of text('ss', ['-tlnp']).split(/\r?\n/)) {
			if (!line.startsWith('LISTEN')) continue;
			const portsOnLine = [...line.matchAll(/:(\d{2,5})\b/g)].map((match) => Number(match[1]));
			const pid = line.match(/pid=(\d+)/);
			if (pid && portsOnLine.some((port) => wanted.includes(port))) pids.add(pid[1]);
		}
		if (pids.size > 0) return { pids, errors };
	}

	for (const port of wanted) {
		for (const line of text('lsof', ['-nP', `-tiTCP:${port}`, '-sTCP:LISTEN']).split(/\r?\n/)) {
			if (/^\d+$/.test(line.trim())) pids.add(line.trim());
		}
	}
	return { pids, errors };
};

/**
 * End a process *and what hangs below it*. A lane's servers start with `shell: true`, so the child this script holds
 * is a shell, and Node documents that signalling a shell does not reliably terminate its descendants: on Windows
 * `child.kill()` ends `cmd.exe` while the app and the mock keep holding their ports (which is the "down did not
 * take the lane, the port is still listening" report). Windows gets `taskkill /F /T` — the tree, walked while the
 * shell is still alive; every other platform gets the process group, because the child is detached below.
 */
const killTree = (pid) => {
	if (typeof pid !== 'number' || !Number.isFinite(pid)) return false;
	if (process.platform === 'win32') {
		// By its full path, not through PATH: a PATH entry earlier than System32 could otherwise supply the binary.
		const taskkill = resolve(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
		const run = spawnSync(taskkill, ['/F', '/T', '/PID', String(pid)], { stdio: 'inherit' });
		return !run.error && run.status === 0;
	}
	let killed = false;
	for (const target of [-pid, pid]) {
		try {
			process.kill(target, 'SIGKILL');
			killed = true;
		} catch {
			// No such group, or it is already gone.
		}
	}
	return killed;
};

if (action === 'down') {
	const { pids, errors } = pidsListeningOn(wantedPorts);
	for (const error of errors) console.error(`listener scan: ${error}`);
	if (pids.size === 0) {
		console.log(`lane ${laneName}: nothing listening on ${wantedPorts.join(', ')}`);
		if (errors.length) {
			console.error('that is only what the scan could read: no listener tool on this machine answered');
			process.exit(1);
		}
		process.exit(0);
	}
	console.log(`lane ${laneName}: killing ${[...pids].join(', ')} (only its own ports ${wantedPorts.join(', ')})`);
	for (const pid of pids) killTree(Number(pid));
	process.exit(0);
}

/**
 * What a running lane app *thinks* its own origins are, read from the runtime env it renders into
 * `<html data-ever-teams-runtime-env="…">` (`app/[locale]/layout.tsx` → `getPublicRuntimeEnv()`). That is the
 * browser half of the configuration; the server-side handlers read the non-public twin (`GAUZY_API_SERVER_URL`),
 * and both come from the same env object in `test-servers.ts`, so a mismatch here is a real miswiring rather than
 * a rendering detail.
 *
 * This exists because the failure it catches is invisible otherwise: a lane app pointed at a mock that is not its
 * own answers every request with 200s of HTML and 502 JSON, and a suite reads that as "the guard let this through".
 */
const laneAppRuntimeEnv = async (port) => {
	try {
		const response = await fetch(`http://localhost:${port}/`, {
			redirect: 'follow',
			signal: AbortSignal.timeout(180_000)
		});
		const html = await response.text();
		const match = html.match(/data-ever-teams-runtime-env="([^"]*)"/);
		if (!match) return undefined;
		const json = match[1]
			.replace(/&quot;/g, '"')
			.replace(/&#x27;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&');
		return JSON.parse(json);
	} catch {
		return undefined;
	}
};

/** The four origins a lane's app must name. Returns the mismatches, in words. */
const laneAppMiswiring = async (lanePorts) => {
	const env = await laneAppRuntimeEnv(lanePorts.app);
	if (!env) {
		return [
			`no runtime env on http://localhost:${lanePorts.app} — that lane's app is not answering (start it with \`up ${laneName}\`)`
		];
	}
	/**
	 * Only the public keys, because `getPublicRuntimeEnv()` (core/services/server/runtime-env.ts) is what the page
	 * carries and it filters out everything non-public — asking for `GAUZY_API_SERVER_URL` here would call every
	 * healthy lane miswired. `test-servers.ts` sets both twins from one env object, so the public one proves it.
	 */
	const expected = {
		NEXT_PUBLIC_GAUZY_API_SERVER_URL: `http://127.0.0.1:${lanePorts.mock}`,
		NEXT_PUBLIC_WEB_APP_URL: `http://localhost:${lanePorts.app}`,
		NEXT_PUBLIC_EVER_STATS_API_URL: `http://127.0.0.1:${lanePorts.platform}`
	};
	return Object.entries(expected)
		.filter(([key, want]) => env[key] !== want)
		.map(([key, want]) => `${key} is ${JSON.stringify(env[key] ?? null)}, must be ${JSON.stringify(want)}`);
};

if (action === 'check') {
	const problems = await laneAppMiswiring(ports);
	if (problems.length) {
		console.error(`lane ${laneName}: MISWIRED — ${problems.join('; ')}`);
		console.error(
			`fix: \`down ${laneName}\` then \`up ${laneName}\` — a reused server keeps the environment it was started with.`
		);
		process.exit(1);
	}
	console.log(
		`lane ${laneName}: OK — the app on ${ports.app} names its own mock ${ports.mock} and stats sink ${ports.platform}`
	);
	process.exit(0);
}

if (action !== 'up') {
	console.error('usage: lane-servers.mjs up|down|check <lane>');
	process.exit(2);
}

/**
 * A lane's server output goes to a file, and that is a bug fix rather than a convenience.
 *
 * `spawn(..., { shell: true })` with the default stdio hands the child pipes, and nothing in this script ever
 * reads them. A child that writes enough output fills the pipe buffer (~64 KB) and blocks *inside its own
 * `console.log`* — alive, listening on its port, and frozen mid-request. Measured on this machine, with a child
 * that writes 2 MB and then a marker file: with unread pipes the marker never appeared in 6 s and the child was
 * alive with `exitCode=null`; with `stdio` pointed at a file descriptor the marker appeared. This is what two
 * lane runs hit today — "the app died mid-suite while `netstat` still showed its port listening", with a wall of
 * 60 s request timeouts behind it, fixed each time by `down` + `up`.
 *
 * The file is also what a lane reads when a suite goes strange: `artifacts/` is git-ignored, so the log is there
 * to look at and never ends up in a commit.
 */
const serverLog = resolve(CONFIG_DIR, 'artifacts', `lane-${laneName}-server.log`);
// `openSync(..., 'w')` creates the file and not the folder holding it, so on a checkout that has never run a lane
// this failed with ENOENT before either server started. `artifacts/` is git-ignored, so it is exactly the folder
// that is missing on a fresh clone.
mkdirSync(dirname(serverLog), { recursive: true });
const serverLogFd = openSync(serverLog, 'w');

const { servers } = laneServers(laneName, { everId: process.env.E2E_EVER_ID === '1' });
const children = servers.map((server) => {
	console.log(`starting ${server.command} (port ${server.port}), output → ${serverLog}`);
	return spawn(server.command, {
		cwd: resolve(CONFIG_DIR, server.cwd),
		env: { ...process.env, ...server.env },
		shell: true,
		// Off Windows this child leads its own process group, which is what `killTree` signals. On Windows the
		// option does nothing and `taskkill /T` walks the tree instead.
		detached: process.platform !== 'win32',
		stdio: ['ignore', serverLogFd, serverLogFd]
	});
});

/**
 * Stop this lane's servers, and mean it: signal each child, wait for it to be gone, and end the whole tree of any
 * that did not go. Used by Ctrl-C, by SIGTERM, by "a port never answered" and by "this lane is miswired" — the same
 * cleanup in all four, because a launcher that exits while its app and mock keep their ports leaves the next agent a
 * server configured for somebody else's run.
 */
const shutdown = async (why, code = 0) => {
	console.log(`stopping (${why})`);
	const gone = children.map(
		(child) => new Promise((done) => (child.exitCode !== null || child.killed ? done() : child.once('exit', done)))
	);
	if (process.platform !== 'win32') {
		for (const child of children) {
			try {
				process.kill(-child.pid, 'SIGTERM');
			} catch {
				try {
					child.kill('SIGTERM');
				} catch {
					// Already gone.
				}
			}
		}
	}
	const allGone = await Promise.race([Promise.all(gone).then(() => true), sleep(5000).then(() => false)]);
	if (!allGone || children.some((child) => child.exitCode === null)) {
		for (const child of children) {
			if (child.exitCode === null) killTree(child.pid);
		}
	}
	process.exit(code);
};

process.on('SIGINT', () => {
	void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
	void shutdown('SIGTERM');
});

const deadline = Date.now() + 25 * 60 * 1000;
for (const port of [ports.control, ports.app]) {
	let ready = false;
	while (!ready && Date.now() < deadline) {
		ready = await listening(port);
		if (!ready) await sleep(2000);
	}
	if (!ready) {
		await shutdown(`port ${port} never answered`, 1);
	}
	console.log(`port ${port} answers`);
}

/**
 * The last thing a lane needs before it trusts a run: that the app it just started is configured for *this* lane.
 * Costs one page render (a cold lane pays it here instead of paying it inside a test), and it is the only thing
 * that would have caught the miswiring described above. `check` runs the same function on servers already running.
 */
const problems = await laneAppMiswiring(ports);
if (problems.length) {
	console.error(`lane ${laneName}: MISWIRED — ${problems.join('; ')}`);
	console.error(
		`a server left over from another run keeps the environment it was started with; run \`down ${laneName}\` first`
	);
	await shutdown('miswired lane', 1);
}
console.log(`checked: the app on ${ports.app} names its own mock ${ports.mock} and statistics sink ${ports.platform}`);

console.log(
	`ready: lane ${laneName} — app http://localhost:${ports.app}, mock ${ports.mock}, stats ${ports.platform}, control ${ports.control}, issuer ${ports.idp}`
);
console.log('leave this running while the lane runs Playwright; press Ctrl-C (or run `down`) when it is done.');
