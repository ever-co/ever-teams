// The command line itself: help, version, the options it reads and the exit codes of a usage error. Against the
// built command line: node --test test/*.test.mjs (from apps/cli, after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOptions } from '../dist/args.js';
import { COMMANDS } from '../dist/commands/index.js';
import { newHome, runCli } from './support/cli.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(here, '..', 'dist', 'index.js');
const { version } = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

test('--version answers the version of the package', async () => {
	const plain = await runCli(['--version']);
	const json = await runCli(['--version', '--json']);

	assert.equal(plain.code, 0);
	assert.equal(plain.stdout, `${version}\n`);
	assert.deepEqual(JSON.parse(json.stdout), { version });
});

test('--help lists every command with the exit codes and the environment variables', async () => {
	for (const argv of [['--help'], ['-h'], ['help']]) {
		const { code, stdout, stderr } = await runCli(argv);

		assert.equal(code, 0);
		assert.equal(stderr, '');
		assert.match(stdout, /^Usage: ever-teams <command> \[options\]/);
		for (const command of COMMANDS) {
			assert.match(stdout, new RegExp(`\\n  ${command.name} +${command.summary}`));
		}
		assert.match(stdout, /Exit codes: 0 done, 1 refused or failed, 2 usage error\./);
		assert.match(stdout, /EVER_TEAMS_TOKEN/);
		assert.match(stdout, /EVER_TEAMS_API_URL/);
	}
});

test('--help with --json answers the same text in JSON', async () => {
	const cases = [['--help'], ['-h'], ['help'], ['help', 'log'], ['log', '--help']];
	for (const argv of cases) {
		const plain = await runCli(argv);
		const asJson = await runCli([...argv, '--json']);

		assert.match(plain.stdout, /^Usage: ever-teams /);
		assert.equal(asJson.code, 0, argv.join(' '));
		assert.equal(asJson.stderr, '');
		assert.deepEqual(JSON.parse(asJson.stdout), { help: plain.stdout });
	}
});

test('a missing or unknown command, or an option before it, is a usage error (2)', async () => {
	const cases = [
		{ argv: [], says: /Name a command/ },
		{ argv: ['dance'], says: /There is no command dance\./ },
		{ argv: ['--json', 'status'], says: /Put the command first/ },
		{ argv: ['help', 'dance'], says: /There is no command dance\./ }
	];
	for (const { argv, says } of cases) {
		const { code, stdout, stderr } = await runCli(argv);

		assert.equal(code, 2, argv.join(' '));
		assert.equal(stdout, '');
		assert.match(stderr, says);
		assert.match(stderr, /Run ever-teams --help to see the commands\./);
	}
});

test('a usage error with --json is a JSON error on the error output', async () => {
	const { code, stdout, stderr } = await runCli(['dance', '--json']);

	assert.equal(code, 2);
	assert.equal(stdout, '');
	assert.deepEqual(JSON.parse(stderr), {
		error: { code: 'USAGE', message: 'There is no command dance. Run ever-teams --help to see the commands.' }
	});
});

const START_OPTIONS = { project: { type: 'string' }, 'token-stdin': { type: 'boolean' } };

test('the options of a command are its own and the common ones', () => {
	const values = parseOptions(
		'start',
		['--project', 'Website', '--json', '--api-url=http://127.0.0.1:3000/api'],
		START_OPTIONS
	);

	assert.deepEqual({ ...values }, { project: 'Website', json: true, 'api-url': 'http://127.0.0.1:3000/api' });
	assert.deepEqual(
		{ ...parseOptions('start', ['--project=-dash', '-h'], START_OPTIONS) },
		{ project: '-dash', help: true }
	);
});

test('an unknown option, an argument, a missing value or a value given to a flag is refused', () => {
	const refused = [
		{ args: ['--colour'], says: /^start has no option --colour\.$/ },
		{ args: ['-x'], says: /^start has no option -x\.$/ },
		{ args: ['Website'], says: /^start takes options only, and Website is not one\.$/ },
		{ args: ['--project'], says: /^--project needs a value\.$/ },
		{
			args: ['--project', '--json'],
			says: /^--project needs a value\. For a value that starts with -, write --project=--json\.$/
		},
		{ args: ['--json=yes'], says: /^--json takes no value\.$/ },
		{ args: ['--', 'Website'], says: /takes options only/ }
	];
	for (const { args, says } of refused) {
		assert.throws(
			() => parseOptions('start', args, START_OPTIONS),
			(error) => {
				assert.equal(error.name, 'UsageError', args.join(' '));
				assert.match(error.message, says);
				return true;
			}
		);
	}
});

test('the installed command answers through its exit code', () => {
	const home = newHome();
	const env = { ...process.env, XDG_CONFIG_HOME: home, APPDATA: home, EVER_TEAMS_TOKEN: '', EVER_TEAMS_API_URL: '' };

	const shown = spawnSync(process.execPath, [BIN, '--version'], { env, encoding: 'utf8' });
	const unknown = spawnSync(process.execPath, [BIN, 'dance'], { env, encoding: 'utf8' });

	assert.ok(fs.readFileSync(BIN, 'utf8').startsWith('#!/usr/bin/env node\n'));
	assert.equal(shown.status, 0);
	assert.equal(shown.stdout, `${version}\n`);
	assert.equal(unknown.status, 2);
	assert.match(unknown.stderr, /There is no command dance\./);
});
