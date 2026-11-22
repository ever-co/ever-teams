// How the kit reads a sign-in that asks for a two-factor code (src/lib/errors/two-factor.ts, ever-co/ever-teams#5701):
// node --test test/*.test.mjs (from packages/toolkit/atoms).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two-factor-'));
	const outfile = path.join(bundleDir, 'two-factor.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'errors', 'two-factor.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		outfile
	});
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

const ENDS = '2026-11-22T10:05:00.000Z';
const BEFORE_END = Date.parse('2026-11-22T10:04:00.000Z');
const AFTER_END = Date.parse('2026-11-22T10:06:00.000Z');

test('a sign-in answered TWO_FACTOR_REQUIRED gives its challenge and its end', () => {
	const answer = { statusCode: 403, code: 'TWO_FACTOR_REQUIRED', message: 'Enter the code', challenge: 'c-1', expiresAt: ENDS };

	assert.deepEqual(kit.twoFactorChallengeOf(answer), { challenge: 'c-1', expiresAt: ENDS });
});

test('any other refusal, and a TWO_FACTOR_REQUIRED without a challenge, give no challenge', () => {
	assert.equal(kit.twoFactorChallengeOf({ statusCode: 403, message: 'Forbidden resource' }), null);
	assert.equal(kit.twoFactorChallengeOf({ statusCode: 401, message: 'Unauthorized' }), null);
	assert.equal(kit.twoFactorChallengeOf({ statusCode: 403, code: 'TWO_FACTOR_REQUIRED' }), null);
	assert.equal(kit.twoFactorChallengeOf({ message: 'Failed to fetch' }), null);
});

test('a 401 while the challenge lasts is a wrong code, after it ended an expired sign-in', () => {
	assert.equal(kit.twoFactorFailureOf({ statusCode: 401 }, ENDS, BEFORE_END), 'wrong-code');
	assert.equal(kit.twoFactorFailureOf({ statusCode: 401 }, ENDS, AFTER_END), 'expired');
	assert.equal(kit.twoFactorFailureOf({ statusCode: 401 }, '', AFTER_END), 'wrong-code');
});

test('too many codes, a malformed code and any other failure each get their own kind', () => {
	assert.equal(kit.twoFactorFailureOf({ statusCode: 429 }, ENDS, BEFORE_END), 'too-many');
	assert.equal(kit.twoFactorFailureOf({ statusCode: 400 }, ENDS, BEFORE_END), 'wrong-code');
	assert.equal(kit.twoFactorFailureOf({ statusCode: 503 }, ENDS, BEFORE_END), 'failed');
	assert.equal(kit.twoFactorFailureOf({ message: 'Failed to fetch' }, ENDS, BEFORE_END), 'failed');
});

test('a typed code keeps its six digits, a recovery code its letters, digits and dashes', () => {
	assert.equal(kit.authenticatorCodeOf('123 456'), '123456');
	assert.equal(kit.authenticatorCodeOf('12-34-5678'), '123456');
	assert.equal(kit.recoveryCodeOf('abcd-efgh ijkl-mnop'), 'ABCD-EFGHIJKL-MNOP');
});

test('a code is sent once it has six digits, a recovery code once it has eight characters', () => {
	assert.equal(kit.isCompleteTwoFactorCode('12345', false), false);
	assert.equal(kit.isCompleteTwoFactorCode('123456', false), true);
	assert.equal(kit.isCompleteTwoFactorCode('ABCD-EFG', true), false);
	assert.equal(kit.isCompleteTwoFactorCode('ABCD-EFGH', true), true);
});
