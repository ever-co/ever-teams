// The read of the signed-in user and the page's notice (src/lib/hooks/useAuthUser.ts): node --test test/*.test.mjs (from
// packages/toolkit/atoms). esbuild bundles the hook with jotai, the API client and the kit's atoms replaced by the stubs
// below; React renders it in jsdom.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test, before, after } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// The kit's probe of the API after a request that got no answer: down unless a test says it is up.
globalThis.__apiDown = true;
globalThis.fetch = async () => {
	if (globalThis.__apiDown) throw new TypeError('Failed to fetch');
	return {};
};

const lib = path.join(here, '..', 'src', 'lib');
const stubs = {
	'@ever-teams/api': `
		globalThis.__userReads = [];
		export const getUser = ({ token }) => new Promise((resolve) => globalThis.__userReads.push(Object.assign(resolve, { token })));
		export const apiConfigManager = { getConfig: () => ({ apiUrl: 'http://api.test/api' }) };
		// Imported by the timer status module, which useAuthUser takes errorMessageOf from; not called here.
		export const getTimerStatus = async () => ({});`,
	'@ever-teams/toolkit-types': 'export {};',
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });',
	'teams-context': 'export const useTeamsContext = () => ({});',
	'teams-atoms': `
		import { atom } from 'jotai';
		export const userAtom = atom({ data: null, loading: false });
		export const selectedEmployeeAtom = atom('all');`
};
const stubbed = /^(@ever-teams\/api|@ever-teams\/toolkit-types|react-i18next)$/;

let React;
let act;
let createRoot;
let useAuthUser;
let kitNoticeAtom;
let useAtomValue;
let getDefaultStore;
let userAtom;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-user-notice-'));
	const outfile = path.join(bundleDir, 'auth-user.mjs');
	await esbuild.build({
		stdin: {
			contents: [
				"export { useAuthUser } from './hooks/useAuthUser';",
				"export { kitNoticeAtom } from './errors/kit-notice-atom';",
				"export { userAtom } from './teams-jotai/atoms/teams-atoms';",
				"export { useAtomValue, getDefaultStore } from 'jotai';"
			].join('\n'),
			resolveDir: lib,
			loader: 'ts'
		},
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime'],
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: stubbed }, (args) => ({ path: args.path, namespace: 'stub' }));
					build.onResolve({ filter: /^\.\/teams-context$/ }, () => ({
						path: 'teams-context',
						namespace: 'stub'
					}));
					build.onResolve({ filter: /teams-jotai\/atoms\/teams-atoms$/ }, () => ({
						path: 'teams-atoms',
						namespace: 'stub'
					}));
					build.onResolve({ filter: /^@lib\// }, (args) => {
						const base = path.join(lib, args.path.slice('@lib/'.length));
						const file = ['.tsx', '.ts'].map((ext) => `${base}${ext}`).find((p) => fs.existsSync(p));
						return { path: file ?? `${base}.tsx` };
					});
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
						loader: 'js',
						resolveDir: lib
					}));
				}
			}
		]
	});
	fs.mkdirSync(path.join(bundleDir, 'node_modules'));
	fs.symlinkSync(
		path.dirname(require.resolve('react/package.json')),
		path.join(bundleDir, 'node_modules', 'react'),
		'junction'
	);
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	({ useAuthUser, kitNoticeAtom, useAtomValue, getDefaultStore, userAtom } = await import(
		pathToFileURL(outfile).href
	));
});

const roots = [];

after(async () => {
	for (const root of roots.splice(0)) await act(async () => root.unmount());
	if (!bundleDir) return;
	const link = path.join(bundleDir, 'node_modules', 'react');
	// A symbolic link on POSIX, a junction on Windows: remove the link itself, never what it points to.
	if (fs.existsSync(link)) {
		try {
			fs.unlinkSync(link);
		} catch {
			fs.rmdirSync(link);
		}
	}
	if (!fs.existsSync(link)) {
		fs.rmSync(bundleDir, { recursive: true, force: true });
	}
});

// Lets the async work of a failed read (the probe of the API) settle.
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

// The hook as TeamsProvider runs it, with the page's notice next to it. The kit's atoms live in jotai's default store
// here: each test starts them empty, in its own root once the previous one is gone.
async function mount(token, seen) {
	for (const root of roots.splice(0)) await act(async () => root.unmount());
	globalThis.__userReads.length = 0;
	getDefaultStore().set(userAtom, { data: null, loading: false });
	getDefaultStore().set(kitNoticeAtom, null);
	const Probe = () => {
		seen.user = useAuthUser(token);
		seen.notice = useAtomValue(kitNoticeAtom);
		return null;
	};
	const root = createRoot(document.createElement('div'));
	roots.push(root);
	await act(async () => root.render(React.createElement(Probe)));
}

test('a user read that finds Ever Teams unreachable reads again once back online, and the good read ends the notice', async () => {
	globalThis.__apiDown = true;
	const seen = {};
	await mount('token-1', seen);
	assert.equal(globalThis.__userReads.length, 1);

	await act(async () => globalThis.__userReads[0]({ message: 'Failed to fetch' }));
	await flush();
	assert.equal(seen.notice?.kind, 'unreachable');

	globalThis.__apiDown = false;
	await act(async () => window.dispatchEvent(new window.Event('online')));
	assert.equal(globalThis.__userReads.length, 2, 'read again when the browser is back online');
	await act(async () => globalThis.__userReads[1]({ id: 'u', tenantId: 't', employee: { id: 'e' } }));
	await flush();

	assert.equal(seen.user.data?.id, 'u');
	assert.equal(seen.notice, null);

	await act(async () => window.dispatchEvent(new window.Event('online')));
	assert.equal(globalThis.__userReads.length, 2, 'no more reads once the user is read');
});

test('a stored session the API refuses says the session ended, and is not read again on its own', async () => {
	const seen = {};
	await mount('token-2', seen);

	await act(async () => globalThis.__userReads[0]({ statusCode: 401, message: 'Unauthorized' }));
	await flush();
	assert.equal(seen.notice?.kind, 'session');

	await act(async () => window.dispatchEvent(new window.Event('online')));
	assert.equal(globalThis.__userReads.length, 1);
});
