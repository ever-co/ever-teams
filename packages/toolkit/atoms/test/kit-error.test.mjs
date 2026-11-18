// How the kit tells failures apart (src/lib/errors/kit-error.ts): node --test test/*.test.mjs (from packages/toolkit/atoms).
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
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-error-'));
	const outfile = path.join(bundleDir, 'kit-error.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'errors', 'kit-error.ts')],
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

test('the API codes for a site that may not embed mean "not allowed", whatever the status', () => {
	assert.equal(kit.kindOfAnswer({ statusCode: 403, code: 'EMBED_ORIGIN_NOT_ALLOWED' }), 'origin');
	assert.equal(kit.kindOfAnswer({ statusCode: 403, code: 'EMBED_ORIGIN' }), 'origin');
});

test('401 is a session that ended, 403 a missing permission, 5xx an unreachable API, anything else the API own text', () => {
	assert.equal(kit.kindOfAnswer({ statusCode: 401 }), 'session');
	assert.equal(kit.kindOfAnswer({ statusCode: 403, code: 'EMBED_SCOPE' }), 'permission');
	assert.equal(kit.kindOfAnswer({ statusCode: 502 }), 'unreachable');
	assert.equal(kit.kindOfAnswer({ statusCode: 400 }), null);
	assert.deepEqual(kit.noticeOfAnswer({ statusCode: 400 }, 'Pick a project first'), {
		kind: 'other',
		message: 'Pick a project first'
	});
});

test('a request with no answer: not allowed when the API answers a no-cors probe, unreachable when it does not', async () => {
	const up = async (url, init) => {
		assert.equal(init.mode, 'no-cors');
		return {};
	};
	const down = async () => {
		throw new TypeError('Failed to fetch');
	};

	assert.equal(await kit.kindOfFailedRequest('http://api.test/api', up), 'origin');
	assert.equal(await kit.kindOfFailedRequest('http://api.test/api', down), 'unreachable');
	assert.equal(await kit.kindOfFailedRequest('', up), 'unreachable');
});

test('every kind has a message in both kit locales', () => {
	const locales = ['en', 'fr'].map((lang) =>
		JSON.parse(fs.readFileSync(path.join(here, '..', 'src', 'lib', 'i18n', 'locales', `${lang}.json`), 'utf8'))
	);
	for (const key of [...Object.values(kit.KIT_ERROR_MESSAGE_KEYS), 'KIT_ERRORS.SIGN_IN_AGAIN']) {
		const [group, name] = key.split('.');
		for (const locale of locales) {
			assert.ok(locale[group]?.[name], key);
		}
	}
});

test('only a string code names a site that is not allowed', () => {
	assert.equal(kit.kindOfAnswer({ statusCode: 400, code: { toString: () => 'EMBED_ORIGIN' } }), null);
});

test('a probe the API never answers counts as unreachable once its time is up, and is aborted', async () => {
	let signal;
	const stalls = (url, init) => {
		signal = init.signal;
		return new Promise(() => {});
	};

	assert.equal(await kit.kindOfFailedRequest('http://api.test/api', stalls, 20), 'unreachable');
	assert.equal(signal?.aborted, true);
});

test('an error the API package returns with no status got no answer: the probe tells why', async () => {
	const up = async () => ({});
	const api = 'http://api.test/api';

	assert.deepEqual(await kit.noticeOfFailure({ error: 'Failed to fetch' }, 'Failed to fetch', api, up), {
		kind: 'origin'
	});
	assert.deepEqual(await kit.noticeOfFailure({ statusCode: 401, message: 'Unauthorized' }, 'Unauthorized', api, up), {
		kind: 'session'
	});
});

test('a refused sign-in: the kit words no answer, a site not allowed, a permission and an API down; a 401 and other refusals stay the form own', async () => {
	const up = async () => ({});
	const api = 'http://api.test/api';

	assert.equal(await kit.kindOfSignInFailure({ message: 'Failed to fetch' }, api, up), 'origin');
	assert.equal(
		await kit.kindOfSignInFailure({ statusCode: 403, code: 'EMBED_ORIGIN_NOT_ALLOWED' }, api, up),
		'origin'
	);
	assert.equal(await kit.kindOfSignInFailure({ statusCode: 403, message: 'Forbidden' }, api, up), 'permission');
	assert.equal(
		await kit.kindOfSignInFailure({ statusCode: 503, message: 'Service Unavailable' }, api, up),
		'unreachable'
	);
	assert.equal(await kit.kindOfSignInFailure({ statusCode: 401, message: 'Unauthorized' }, api, up), null);
	assert.equal(await kit.kindOfSignInFailure({ statusCode: 400, message: 'email must be an email' }, api, up), null);
});
