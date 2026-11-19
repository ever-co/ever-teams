// The installed command line: its bin and its version. Against the built command line: node --test
// test/*.test.mjs (from apps/cli, after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(here, '..', 'dist', 'index.js');
const { version } = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

test('the installed command answers through its exit code', () => {
	const shown = spawnSync(process.execPath, [BIN, '--version'], { encoding: 'utf8' });
	const unknown = spawnSync(process.execPath, [BIN, 'dance'], { encoding: 'utf8' });

	assert.ok(fs.readFileSync(BIN, 'utf8').startsWith('#!/usr/bin/env node\n'));
	assert.equal(shown.status, 0);
	assert.equal(shown.stdout, `${version}\n`);
	assert.equal(unknown.status, 2);
});
