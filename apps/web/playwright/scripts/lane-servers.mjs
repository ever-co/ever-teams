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
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LANE_PORTS, laneServers } from '../test-servers.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
/** `test-servers.ts` writes its `cwd` relative to the folder holding a Playwright config, which is one level above this `scripts/` folder. */
const CONFIG_DIR = resolve(HERE, '..');

const [action, laneName] = process.argv.slice(2);
const ports = LANE_PORTS[laneName];

if (!ports) {
	console.error(`usage: lane-servers.mjs up|down <${Object.keys(LANE_PORTS).join('|')}>`);
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
	console.log(`lane ${laneName}: killing ${[...victims].join(', ')} (only its own ports ${Object.values(ports).join(', ')})`);
	for (const pid of victims) {
		spawnSync('taskkill', ['/F', '/T', '/PID', pid], { stdio: 'inherit', shell: true });
	}
	process.exit(0);
}

if (action !== 'up') {
	console.error('usage: lane-servers.mjs up|down <lane>');
	process.exit(2);
}

process.env.E2E_LANE = laneName;
const { servers } = laneServers(laneName, { everId: process.env.E2E_EVER_ID === '1' });
const children = servers.map((server) => {
	console.log(`starting ${server.command} (port ${server.port})`);
	return spawn(server.command, { cwd: resolve(CONFIG_DIR, server.cwd), env: { ...process.env, ...server.env }, shell: true });
});

const shutdown = (why) => {
	console.log(`stopping (${why})`);
	for (const child of children) {
		child.kill('SIGTERM');
	}
	process.exit(0);
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

console.log(`ready: lane ${laneName} — app http://localhost:${ports.app}, mock ${ports.mock}, stats ${ports.platform}, control ${ports.control}, issuer ${ports.idp}`);
console.log('leave this running while the lane runs Playwright; press Ctrl-C (or run `down`) when it is done.');
