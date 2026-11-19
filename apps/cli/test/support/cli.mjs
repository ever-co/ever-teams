// Runs the built command line (tsc first) in this process: its own settings folder, the stdin, fetch and clock a
// test gives, and its output kept. A fetch the test does not give fails the test: no command reaches a network.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after } from 'node:test';
import { Readable } from 'node:stream';
import { run } from '../../dist/run.js';

const homes = [];

after(() => {
	homes.forEach((home) => fs.rmSync(home, { recursive: true, force: true }));
});

/** A new folder that stands for the home and the settings folder of one test. */
export function newHome() {
	const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ever-teams-cli-'));
	homes.push(home);
	return home;
}

const noNetwork = async (url) => {
	throw new Error(`The test sent a request it did not expect: ${url}`);
};

function inputOf(stdin) {
	if (stdin === undefined) {
		return Readable.from([]);
	}
	if (typeof stdin === 'string') {
		return Readable.from([stdin]);
	}
	return stdin;
}

/** Settings of the platform the tests run on, all in `home`. */
export const placeOf = (home) => ({
	env: { XDG_CONFIG_HOME: home, APPDATA: home },
	platform: process.platform,
	homedir: home
});

// The time a run reads: the one a test gives, or what its clock function answers at each read.
function timeOf(now) {
	if (typeof now === 'function') {
		return now();
	}
	return now ?? new Date();
}

/**
 * Runs `argv` and answers its exit code and what it wrote. `env` is added to the settings folder's variables;
 * `stdin` is a text, a stream, or nothing; `now` a Date or a function that answers one.
 */
export async function runCli(argv, { home = newHome(), env = {}, fetch = noNetwork, stdin, now } = {}) {
	let stdout = '';
	let stderr = '';
	const place = placeOf(home);
	const io = {
		argv,
		env: { ...place.env, ...env },
		platform: place.platform,
		homedir: place.homedir,
		stdin: inputOf(stdin),
		writeOut: (text) => {
			stdout += text;
		},
		writeErr: (text) => {
			stderr += text;
		},
		fetch,
		now: () => timeOf(now)
	};
	const code = await run(io);
	return { code, stdout, stderr, home };
}
