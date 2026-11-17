// A sign-out that keeps the page forgets the whole account: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the hook with the kit's atoms and jotai, toolkit-ui replaced by a stand-in; React renders it in jsdom.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const esbuild = require('esbuild');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// The atoms module reads the stored font through the global localStorage.
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let React;
let act;
let createRoot;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clear-session-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const lib = path.join(here, '..', 'src', 'lib').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { useClearKitSession } from '${lib}/hooks/useClearKitSession.ts';
		export * from '${lib}/teams-jotai/atoms/teams-atoms.ts';
		export { Provider, createStore } from 'jotai';`
	);
	const outfile = path.join(bundleDir, 'kit.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		// The entry sits in the OS temp folder: jotai resolves from the folder that holds the kit's own copy.
		nodePaths: [path.dirname(path.dirname(require.resolve('jotai/package.json')))],
		external: ['react', 'react/jsx-runtime'],
		alias: {
			'@lib': path.join(here, '..', 'src', 'lib'),
			'@hooks': path.join(here, '..', 'src', 'lib', 'hooks'),
			'@components': path.join(here, '..', 'src', 'lib', 'components')
		},
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /^@ever-teams\/toolkit-ui$/ }, () => ({
						path: 'toolkit-ui',
						namespace: 'stub'
					}));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
						contents: 'export const getWeekStartAndEnd = () => ({ start: new Date(0), end: new Date(0) });',
						loader: 'js'
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
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
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
	// Only once the link to React is gone: the folder then holds nothing but the bundle.
	if (!fs.existsSync(link)) {
		fs.rmSync(bundleDir, { recursive: true, force: true });
	}
});

test('clearing the session puts every account atom back to its first value', async () => {
	const store = kit.createStore();
	const firstValues = new Map();
	const account = [
		[kit.accessTokenAtom, 'token-a'],
		[kit.userAtom, { data: { id: 'user-a' }, loading: false }],
		[kit.userPermissionsAtom, { data: [{ permission: 'ORG_TEAM_EDIT' }], loading: false }],
		[kit.userOrganizationsAtom, { data: { items: [{ organizationId: 'org-a' }], total: 1 }, loading: false }],
		[kit.selectedOrganizationAtom, 'org-a'],
		[kit.selectedTeamAtom, 'team-a'],
		[kit.selectedEmployeeAtom, 'employee-a']
	];
	for (const [atom, value] of account) {
		firstValues.set(atom, store.get(atom));
		store.set(atom, value);
	}
	let clearSession;
	function SignOut() {
		clearSession = kit.useClearKitSession();
		return null;
	}
	const root = createRoot(document.createElement('div'));
	await act(async () => root.render(React.createElement(kit.Provider, { store }, React.createElement(SignOut))));

	await act(async () => clearSession());

	for (const [atom] of account) {
		assert.deepEqual(store.get(atom), firstValues.get(atom));
	}
	await act(async () => root.unmount());
});
