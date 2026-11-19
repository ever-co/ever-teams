// The command line itself: its version, the options it reads and the exit codes. Against the built command line:
// node --test test/*.test.mjs (from apps/cli, after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOptions } from '../dist/args.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(here, '..', 'dist', 'index.js');
const { version } = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

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
	const shown = spawnSync(process.execPath, [BIN, '--version'], { encoding: 'utf8' });
	const unknown = spawnSync(process.execPath, [BIN, 'dance'], { encoding: 'utf8' });

	assert.ok(fs.readFileSync(BIN, 'utf8').startsWith('#!/usr/bin/env node\n'));
	assert.equal(shown.status, 0);
	assert.equal(shown.stdout, `${version}\n`);
	assert.equal(unknown.status, 2);
});
