// The workspaces an email and password open, as the kit's sign-in lists them (src/lib/session/workspace-choices.ts,
// ever-co/ever-teams#5700): node --test test/*.test.mjs (from packages/toolkit/atoms).
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
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-choices-'));
	const outfile = path.join(bundleDir, 'workspace-choices.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'session', 'workspace-choices.ts')],
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

const workspace = (name, token) => ({ token, user: { id: `user-${token}`, name: 'Mira Solberg-Eze', tenant: { name } } });

test("each workspace gives its tenant's name and its token, in the API's order", () => {
	const answer = { workspaces: [workspace('Brightline Agency', 't-2'), workspace('Kestrel Studio', 't-1')], total_workspaces: 2 };

	assert.deepEqual(kit.workspaceChoicesOf(answer), [
		{ token: 't-2', name: 'Brightline Agency' },
		{ token: 't-1', name: 'Kestrel Studio' }
	]);
});

test('a workspace without a tenant name keeps an empty name, never the person name', () => {
	const answer = { workspaces: [{ token: 't-1', user: { name: 'Mira Solberg-Eze' } }] };

	assert.deepEqual(kit.workspaceChoicesOf(answer), [{ token: 't-1', name: '' }]);
});

test('an entry without a token is left out, and an answer without a list gives none', () => {
	assert.deepEqual(kit.workspaceChoicesOf({ workspaces: [{ user: { tenant: { name: 'Kestrel Studio' } } }] }), []);
	assert.deepEqual(kit.workspaceChoicesOf({}), []);
	assert.deepEqual(kit.workspaceChoicesOf({ workspaces: null }), []);
});
