// The server entry refuses to run in a page (src/server.ts, src/lib/server/server-only.ts): node --test
// test/*.test.mjs (from packages/api). esbuild bundles the entry; a page is played by a window and a document on
// globalThis, which each test removes again.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { API_URL, CREDENTIAL, ORIGIN, embedApi, reportRead, tokenIssued } from './support/embed-answers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

let bundleDir;
let entryUrl;
let loads = 0;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-only-'));
	const outfile = path.join(bundleDir, 'server.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'server.ts')],
		bundle: true,
		format: 'esm',
		platform: 'node',
		outfile,
		logLevel: 'error'
	});
	entryUrl = pathToFileURL(outfile).href;
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

afterEach(() => {
	delete globalThis.window;
	delete globalThis.document;
});

// A copy of the module of its own at each load, so its top level runs again.
const load = () => {
	loads += 1;
	return import(`${entryUrl}?load=${loads}`);
};

const playPage = () => {
	globalThis.window = globalThis;
	globalThis.document = { title: 'A page' };
};

test('on a server the entry loads and exports the two helpers', async () => {
	const server = await load();

	assert.equal(typeof server.exchangeEmbedToken, 'function');
	assert.equal(typeof server.getClientReport, 'function');
});

test('a page that loads the entry gets a SERVER_ONLY error that says to call it from the server', async () => {
	playPage();

	const error = await load().then(
		() => assert.fail('the entry loaded in a page'),
		(thrown) => thrown
	);

	assert.equal(error.name, 'EverTeamsError');
	assert.equal(error.code, 'SERVER_ONLY');
	assert.equal(error.status, 0);
	assert.match(error.message, /runs on a server only/);
	assert.match(error.nextStep, /from your server/);
});

test('a helper called in a page is refused before any request', async () => {
	const server = await load();
	const exchange = embedApi(() => tokenIssued());
	const report = embedApi(() => reportRead());
	playPage();

	const exchanged = await server
		.exchangeEmbedToken({
			apiUrl: API_URL,
			credential: CREDENTIAL,
			email: 'lina@example.com',
			origin: ORIGIN,
			fetch: exchange.fetch
		})
		.then(
			() => assert.fail('the exchange ran in a page'),
			(thrown) => thrown
		);
	const reported = await server
		.getClientReport({ apiUrl: API_URL, credential: CREDENTIAL, fetch: report.fetch })
		.then(
			() => assert.fail('the report ran in a page'),
			(thrown) => thrown
		);

	assert.equal(exchanged.code, 'SERVER_ONLY');
	assert.equal(reported.code, 'SERVER_ONLY');
	assert.equal(exchange.requests.length, 0);
	assert.equal(report.requests.length, 0);
});

test('a runtime with a window but no document, such as Deno 1, is a server', async () => {
	globalThis.window = globalThis;

	const server = await load();
	const api = embedApi(() => tokenIssued());
	const answer = await server.exchangeEmbedToken({
		apiUrl: API_URL,
		credential: CREDENTIAL,
		email: 'lina@example.com',
		origin: ORIGIN,
		fetch: api.fetch
	});

	assert.equal(typeof answer.token, 'string');
});
