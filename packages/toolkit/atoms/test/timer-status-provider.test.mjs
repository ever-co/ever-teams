// TimerStatusProvider: node --test test/ (from packages/toolkit/atoms).
// esbuild bundles the provider with its context, API client, toasts and translations replaced by the stubs below;
// React renders it in jsdom, and node:test's fake timers drive the one-minute poll.
import { test, before, after, mock } from 'node:test';
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

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let visibility = 'visible';
Object.defineProperty(dom.window.document, 'visibilityState', { get: () => visibility });

const stubs = {
	'./teams-context': `
		// Stable references, as the kit's jotai atoms give them
		const identity = { authenticatedUser: { tenantId: 't', employee: { id: 'e' } }, token: 'token', selectedOrganization: 'org' };
		export const useTeamsContext = () => identity;`,
	'@ever-teams/api': `
		globalThis.__reads = [];
		export const getTimerStatus = () => new Promise((resolve) => globalThis.__reads.push(resolve));`,
	'@ever-teams/toolkit-ui': 'globalThis.__toasts = []; export const toast = (t) => globalThis.__toasts.push(t);',
	'@ever-teams/toolkit-types': 'export {};',
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });'
};
const stubbed =
	/^(\.\/teams-context|@ever-teams\/api|@ever-teams\/toolkit-ui|@ever-teams\/toolkit-types|react-i18next)$/;

let React;
let act;
let createRoot;
let TimerStatusProvider;
let useTimerStatusContext;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'timer-status-'));
	const outfile = path.join(bundleDir, 'provider.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'context', 'teams-timer-status-context.tsx')],
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
					build.onResolve({ filter: stubbed }, (args) => ({ path: args.path, namespace: 'stub' }));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
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
	({ TimerStatusProvider, useTimerStatusContext } = await import(pathToFileURL(outfile).href));
});

after(async () => {
	for (const root of roots.splice(0)) await act(async () => root.unmount());
	const link = path.join(bundleDir, 'node_modules', 'react');
	if (fs.existsSync(link)) fs.rmdirSync(link);
});

// A timer widget: registers with the provider, as useTimerStatus does.
function Widget({ onStatus }) {
	const shared = useTimerStatusContext();
	const register = shared?.registerConsumer;
	React.useEffect(() => register?.(), [register]);
	onStatus?.(shared?.status);
	return null;
}

const roots = [];
async function mount(widgets) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => root.render(React.createElement(TimerStatusProvider, null, ...widgets)));
	return { root, container };
}

async function reset() {
	for (const root of roots.splice(0)) await act(async () => root.unmount());
	globalThis.__reads.length = 0;
	globalThis.__toasts.length = 0;
	visibility = 'visible';
}

const answer = (index, status) =>
	act(async () => globalThis.__reads[index]({ running: false, duration: 0, lastLog: null, ...status }));
const widget = (key, onStatus) => React.createElement(Widget, { key, onStatus });

test('a provider with no timer widget reads nothing', async () => {
	await reset();
	await mount([]);
	assert.equal(globalThis.__reads.length, 0);
});

test('three widgets share one read, and all show its answer', async () => {
	await reset();
	const seen = { a: null, b: null, c: null };
	await mount(['a', 'b', 'c'].map((k) => widget(k, (s) => (seen[k] = s))));

	assert.equal(globalThis.__reads.length, 1);
	await answer(0, { running: true, duration: 120 });
	assert.deepEqual([seen.a?.running, seen.b?.running, seen.c?.running], [true, true, true]);
});

test('the status is read again every minute while the page is visible, and not while it is hidden', async () => {
	await reset();
	mock.timers.enable({ apis: ['setInterval'] });
	try {
		await mount([widget('a')]);
		await answer(0, {});
		await act(async () => mock.timers.tick(60_000));
		assert.equal(globalThis.__reads.length, 2);
		await answer(1, {});

		visibility = 'hidden';
		await act(async () => mock.timers.tick(180_000));
		assert.equal(globalThis.__reads.length, 2);

		visibility = 'visible';
		await act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
		assert.equal(globalThis.__reads.length, 3);
	} finally {
		mock.timers.reset();
	}
});

test('coming back online or to the window reads the status at once', async () => {
	await reset();
	await mount([widget('a')]);
	await answer(0, {});

	await act(async () => window.dispatchEvent(new window.Event('online')));
	assert.equal(globalThis.__reads.length, 2);
	await answer(1, {});
	await act(async () => window.dispatchEvent(new window.Event('focus')));
	assert.equal(globalThis.__reads.length, 3);
});

test('an outage shows one notice, not one per read', async () => {
	await reset();
	await mount([widget('a'), widget('b')]);
	await act(async () => globalThis.__reads[0]({ statusCode: 503, message: 'Service Unavailable' }));
	await act(async () => window.dispatchEvent(new window.Event('online')));
	await act(async () => globalThis.__reads[1]({ statusCode: 503, message: 'Service Unavailable' }));

	assert.equal(globalThis.__toasts.length, 1);
});

test('a start seen by the provider is announced once to screen readers', async () => {
	await reset();
	const { container } = await mount([widget('a')]);
	await answer(0, { running: false });
	const live = container.querySelector('[aria-live="polite"]');
	assert.equal(live.textContent, '');

	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await answer(1, { running: true });
	assert.equal(live.textContent, 'TIME_TRACKER.TIMER_STARTED');
});
