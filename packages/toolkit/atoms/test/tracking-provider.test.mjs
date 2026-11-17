// Lifecycle tests of TrackingProvider: node --test test/ (from packages/toolkit/atoms).
// esbuild bundles the provider with its context and API client replaced by the stubs below; React renders it in jsdom.
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

const dom = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The identity the provider reads, as a store React subscribes to, and the session requests it makes.
const stubs = {
	'./teams-context': `
		import { useSyncExternalStore } from 'react';
		const listeners = new Set();
		globalThis.__identity = { selectedOrganization: 'org-1', selectedEmployee: 'all', token: 'token-a', authenticatedUser: { tenantId: 't', timeZone: 'UTC' } };
		globalThis.__setIdentity = (next) => { globalThis.__identity = { ...globalThis.__identity, ...next }; listeners.forEach((l) => l()); };
		const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
		export const useTeamsContext = () => useSyncExternalStore(subscribe, () => globalThis.__identity);`,
	'@ever-teams/api': `
		globalThis.__requests = [];
		export const trackingApiClient = {
			updateConfig() {},
			getFilteredSessions(from, to, ids, org, tenant, token) {
				return new Promise((resolve) => globalThis.__requests.push({ token, resolve }));
			}
		};`,
	'@ever-teams/toolkit-types': 'export const isSuccessResponse = (r) => r && r.success === true;',
	'@lib/utils/time-zone':
		'export const getUserTimezone = () => "UTC"; export const convertSessionDatesToTimezone = (s) => s;'
};

let React;
let createRoot;
let act;
let TrackingProvider;
let useTrackingContext;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracking-provider-'));
	const outfile = path.join(bundleDir, 'provider.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'context', 'teams-tracking-context.tsx')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		external: ['react', 'react/jsx-runtime'],
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve(
						{
							filter: /^(\.\/teams-context|@ever-teams\/api|@ever-teams\/toolkit-types|@lib\/utils\/time-zone)$/
						},
						(args) => ({ path: args.path, namespace: 'stub' })
					);
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
						loader: 'js',
						resolveDir: here
					}));
				}
			}
		]
	});
	// The bundle imports react from the folder it sits in: point it at the repository's copy.
	fs.mkdirSync(path.join(bundleDir, 'node_modules'));
	fs.symlinkSync(
		path.dirname(require.resolve('react/package.json')),
		path.join(bundleDir, 'node_modules', 'react'),
		'junction'
	);
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	({ TrackingProvider, useTrackingContext } = await import(pathToFileURL(outfile).href));
});

after(() => {
	const link = path.join(bundleDir, 'node_modules', 'react');
	if (fs.existsSync(link)) fs.rmdirSync(link);
});

const answer = (request, sessions) => request.resolve({ success: true, data: { sessions } });
const refuse = (request) => request.resolve({ success: false, error: 'timed out' });
const flush = () => act(async () => {});

function Reader({ onRender }) {
	const context = useTrackingContext();
	onRender(context);
	return null;
}

const roots = [];

// Each test renders in a container of its own, unmounted after it even when an assertion fails.
async function mount(children) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => root.render(React.createElement(TrackingProvider, null, children)));
	return root;
}

const reset = async () => {
	for (const root of roots.splice(0)) await act(async () => root.unmount());
	globalThis.__requests.length = 0;
	globalThis.__setIdentity({ token: 'token-a', selectedEmployee: 'all' });
};

test('a provider without a session component reads no sessions', async () => {
	await reset();
	const root = await mount(null);
	await act(async () => globalThis.__setIdentity({ token: 'token-b' }));

	assert.equal(globalThis.__requests.length, 0);
	await act(async () => root.unmount());
});

test('two session components share one read', async () => {
	await reset();
	const seen = [];
	const reader = (name) => React.createElement(Reader, { key: name, onRender: (c) => seen.push(c.sessions.length) });
	const root = await mount([reader('a'), reader('b')]);

	assert.equal(globalThis.__requests.length, 1);
	await act(async () => answer(globalThis.__requests[0], [{ id: 's1' }]));
	assert.equal(seen.at(-1), 1);
	await act(async () => root.unmount());
});

test('a session component mounted after a change of user never shows the previous user’s sessions', async () => {
	await reset();
	let latest;
	const reader = React.createElement(Reader, { onRender: (c) => (latest = c) });
	const root = await mount(reader);
	await act(async () => answer(globalThis.__requests[0], [{ id: 'first-user-session' }]));
	assert.equal(latest.sessions.length, 1);

	// No session component while another user signs in, then one appears.
	await act(async () => root.render(React.createElement(TrackingProvider, null, null)));
	await act(async () => globalThis.__setIdentity({ token: 'token-other-user', selectedEmployee: 'employee-2' }));
	const firstRenders = [];
	await act(async () =>
		root.render(
			React.createElement(
				TrackingProvider,
				null,
				React.createElement(Reader, { onRender: (c) => firstRenders.push(c.sessions.map((s) => s.id)) })
			)
		)
	);

	assert.deepEqual(firstRenders[0], []);
	await act(async () => root.unmount());
});

test('the answer of a superseded read never replaces a newer one', async () => {
	await reset();
	let latest;
	const withReader = () =>
		React.createElement(TrackingProvider, null, React.createElement(Reader, { onRender: (c) => (latest = c) }));
	const root = await mount(React.createElement(Reader, { onRender: (c) => (latest = c) }));
	const older = globalThis.__requests[0];

	// The last session component leaves and comes back while the first read is still pending.
	await act(async () => root.render(React.createElement(TrackingProvider, null, null)));
	await act(async () => root.render(withReader()));
	const newer = globalThis.__requests[1];
	await act(async () => answer(newer, [{ id: 'fresh' }]));
	await act(async () => refuse(older));
	await flush();

	assert.deepEqual(
		latest.sessions.map((s) => s.id),
		['fresh']
	);
	assert.equal(latest.error, null);
	assert.equal(latest.loading, false);
	await act(async () => root.unmount());
});
