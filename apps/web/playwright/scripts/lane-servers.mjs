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
import { openSync } from 'node:fs';
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

if (action === 'down') {
	const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
	const victims = new Set();
	for (const line of netstat.stdout.split(/\r?\n/)) {
		if (!line.includes('LISTENING')) continue;
		const match = line.match(/:(\d{2,5})\s/);
		if (match && Object.values(ports).includes(Number(match[1]))) {
			victims.add(line.trim().split(/\s+/).pop());
		}
	}
	if (victims.size === 0) {
		console.log(`lane ${laneName}: nothing listening on ${Object.values(ports).join(', ')}`);
		process.exit(0);
	}
	console.log(
		`lane ${laneName}: killing ${[...victims].join(', ')} (only its own ports ${Object.values(ports).join(', ')})`
	);
	for (const pid of victims) {
		spawnSync('taskkill', ['/F', '/T', '/PID', pid], { stdio: 'inherit', shell: true });
	}
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
const serverLogFd = openSync(serverLog, 'w');

const { servers } = laneServers(laneName, { everId: process.env.E2E_EVER_ID === '1' });
const children = servers.map((server) => {
	console.log(`starting ${server.command} (port ${server.port}), output → ${serverLog}`);
	return spawn(server.command, {
		cwd: resolve(CONFIG_DIR, server.cwd),
		env: { ...process.env, ...server.env },
		shell: true,
		stdio: ['ignore', serverLogFd, serverLogFd]
	});
});

const shutdown = (why, code = 0) => {
	console.log(`stopping (${why})`);
	for (const child of children) {
		child.kill('SIGTERM');
	}
	process.exit(code);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const deadline = Date.now() + 25 * 60 * 1000;
for (const port of [ports.control, ports.app]) {
	let ready = false;
	while (!ready && Date.now() < deadline) {
		ready = await listening(port);
		if (!ready) await sleep(2000);
	}
	if (!ready) {
		shutdown(`port ${port} never answered`);
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
	shutdown('miswired lane', 1);
}
console.log(`checked: the app on ${ports.app} names its own mock ${ports.mock} and statistics sink ${ports.platform}`);

console.log(
	`ready: lane ${laneName} — app http://localhost:${ports.app}, mock ${ports.mock}, stats ${ports.platform}, control ${ports.control}, issuer ${ports.idp}`
);
console.log('leave this running while the lane runs Playwright; press Ctrl-C (or run `down`) when it is done.');
