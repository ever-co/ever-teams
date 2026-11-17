// TimerStatusProvider and useTimer: `yarn test` in packages/toolkit/atoms (node --test test/*.test.mjs).
// esbuild bundles the provider and useTimer with their context, API client, toasts and translations replaced by the
// stubs below; React renders them in jsdom, and node:test's fake timers drive the one-minute poll.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test, before, after, mock } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// useAuthUser keeps the session it read in the page's storage.
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// The kit's probe of the API after a request that got no answer: up (an opaque answer) unless a test says it is down.
globalThis.__apiDown = false;
globalThis.__probes = [];
globalThis.fetch = async (url, init) => {
	globalThis.__probes.push({ url, mode: init?.mode });
	if (globalThis.__apiDown) throw new TypeError('Failed to fetch');
	return {};
};
let visibility = 'visible';
Object.defineProperty(dom.window.document, 'visibilityState', { get: () => visibility });

const stubs = {
	'teams-context': `
		// A store with stable references, as the kit's jotai atoms give them; a test can switch organization.
		import { useSyncExternalStore } from 'react';
		const listeners = new Set();
		const first = { authenticatedUser: { id: 'u', tenantId: 't', employee: { id: 'e' } }, token: 'token', selectedOrganization: 'org' };
		let identity = first;
		globalThis.__setIdentity = (next) => { identity = next ? { ...identity, ...next } : first; listeners.forEach((l) => l()); };
		const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
		export const useTeamsContext = () => useSyncExternalStore(subscribe, () => identity);`,
	'@ever-teams/api': `
		globalThis.__reads = [];
		globalThis.__actions = [];
		export const getTimerStatus = (user, token, organizationId) =>
			new Promise((resolve, reject) =>
				globalThis.__reads.push(Object.assign(resolve, { token, organizationId, reject }))
			);
		const action = (kind) => () =>
			new Promise((resolve, reject) => globalThis.__actions.push(Object.assign(resolve, { kind, reject })));
		export const startTimer = action('start');
		export const stopTimer = action('stop');
		export const addTimeSlot = async () => {};
		globalThis.__userReads = [];
		export const getUser = ({ token }) =>
			new Promise((resolve) => globalThis.__userReads.push(Object.assign(resolve, { token })));
		export const apiConfigManager = { getConfig: () => ({ apiUrl: 'http://api.test/api' }) };`,
	'@ever-teams/toolkit-ui': 'globalThis.__toasts = []; export const toast = (t) => globalThis.__toasts.push(t);',
	// The two atoms useAuthUser reads and writes, without the rest of the kit's atoms.
	'teams-atoms': `
		import { atom } from 'jotai';
		export const userAtom = atom({ data: null, loading: false });
		export const selectedEmployeeAtom = atom('all');`,
	'@ever-teams/toolkit-types': 'export {};',
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });'
};
const stubbed = /^(@ever-teams\/api|@ever-teams\/toolkit-ui|@ever-teams\/toolkit-types|react-i18next)$/;
// The provider imports its context as ./teams-context and useTimer as @lib/context/teams-context: one stub for both.
const teamsContext = /^(\.\/teams-context|@lib\/context\/teams-context)$/;
const lib = path.join(here, '..', 'src', 'lib');

let React;
let act;
let createRoot;
let TimerStatusProvider;
let useTimerStatusContext;
let useTimer;
let useTimerStatus;
let kitNoticeAtom;
let getDefaultStore;
let useAtomValue;
let useAuthUser;
let userAtom;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'timer-status-'));
	const outfile = path.join(bundleDir, 'provider.mjs');
	await esbuild.build({
		stdin: {
			contents: [
				"export * from './context/teams-timer-status-context';",
				"export { useTimer } from './hooks/useTimer';",
				"export { useTimerStatus } from './hooks/useTimerStatus';",
				// The page's notice lives in jotai's default store here (no TeamsProvider): each test starts it empty.
				"export { kitNoticeAtom } from './errors/kit-notice-atom';",
				"export { useAuthUser } from './hooks/useAuthUser';",
				"export { userAtom } from './teams-jotai/atoms/teams-atoms';",
				"export { getDefaultStore, useAtomValue } from 'jotai';"
			].join('\n'),
			resolveDir: lib,
			loader: 'ts'
		},
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
					build.onResolve({ filter: teamsContext }, () => ({ path: 'teams-context', namespace: 'stub' }));
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
	({
		TimerStatusProvider,
		useTimerStatusContext,
		useTimer,
		useTimerStatus,
		kitNoticeAtom,
		getDefaultStore,
		useAtomValue,
		useAuthUser,
		userAtom
	} = await import(pathToFileURL(outfile).href));
});

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
	// Only once the link to React is gone: the folder then holds nothing but the bundle.
	if (!fs.existsSync(link)) {
		fs.rmSync(bundleDir, { recursive: true, force: true });
	}
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
	globalThis.__actions.length = 0;
	globalThis.__toasts.length = 0;
	globalThis.__apiDown = false;
	globalThis.__probes.length = 0;
	getDefaultStore().set(kitNoticeAtom, null);
	globalThis.__userReads.length = 0;
	getDefaultStore().set(userAtom, { data: null, loading: false });
	visibility = 'visible';
	await act(async () => globalThis.__setIdentity(null));
}

// Lets the async work of a failed read (the probe of the API) settle.
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
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

test('an outage shows one notice inside the widgets, the same one for every read, and no toast', async () => {
	await reset();
	const seen = {};
	await mount([widget('a'), probe(seen)]);
	await act(async () => globalThis.__reads[0]({ statusCode: 503, message: 'Service Unavailable' }));
	const first = seen.shared.notice;
	await act(async () => window.dispatchEvent(new window.Event('online')));
	await act(async () => globalThis.__reads[1]({ statusCode: 503, message: 'Service Unavailable' }));

	assert.equal(first?.kind, 'unreachable');
	assert.equal(seen.shared.notice, first);
	assert.equal(globalThis.__toasts.length, 0);
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

test('a hidden page reads nothing on mount or when back online, and reads once it becomes visible', async () => {
	await reset();
	visibility = 'hidden';
	await mount([widget('a')]);
	await act(async () => window.dispatchEvent(new window.Event('online')));
	assert.equal(globalThis.__reads.length, 0);

	visibility = 'visible';
	await act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
	assert.equal(globalThis.__reads.length, 1);
});

test('a refresh asked while a read is pending gets a fresh read, so a start is never undone by an older answer', async () => {
	await reset();
	let latest;
	let refetch;
	const Refresher = () => {
		refetch = useTimerStatusContext().refetch;
		return null;
	};
	await mount([widget('a', (s) => (latest = s)), React.createElement(Refresher, { key: 'r' })]);
	const older = globalThis.__reads[0];

	let refreshed = false;
	await act(async () => {
		refetch().then(() => (refreshed = true));
	});
	await act(async () => older({ running: false, duration: 0, lastLog: null }));
	assert.equal(refreshed, false);
	const fresh = globalThis.__reads.at(-1);
	assert.notEqual(fresh, older);
	await act(async () => fresh({ running: true, duration: 5, lastLog: null }));
	assert.equal(refreshed, true);
	assert.equal(latest?.running, true);
});

test('switching organization during a read reads the new one and drops the answer for the old one', async () => {
	await reset();
	let latest;
	await mount([widget('a', (s) => (latest = s))]);
	const forOldOrganization = globalThis.__reads[0];

	await act(async () => globalThis.__setIdentity({ selectedOrganization: 'org-2' }));
	assert.equal(latest, null);
	const forNewOrganization = globalThis.__reads.find((r) => r.organizationId === 'org-2');
	assert.ok(forNewOrganization, 'the new organization is read at once');

	await act(async () => forOldOrganization({ running: true, duration: 99, lastLog: null }));
	assert.equal(latest, null);
	await act(async () => forNewOrganization({ running: false, duration: 3, lastLog: null }));
	assert.equal(latest?.duration, 3);
});

// Everything the provider gives a widget, and its refetch, for the tests below.
function probe(seen) {
	const Probe = () => {
		const shared = useTimerStatusContext();
		const register = shared?.registerConsumer;
		React.useEffect(() => register?.(), [register]);
		seen.shared = shared;
		return null;
	};
	return React.createElement(Probe, { key: 'probe' });
}

test('a failed read for a previous organization shows no notice', async () => {
	await reset();
	await mount([widget('a')]);
	const forOldOrganization = globalThis.__reads[0];

	await act(async () => globalThis.__setIdentity({ selectedOrganization: 'org-2' }));
	await act(async () => forOldOrganization.reject(new Error('network down')));
	await flush();

	assert.equal(globalThis.__toasts.length, 0);
});

test('after switching away and back, an answer from the first visit is dropped and the pending read is kept', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	const firstVisit = globalThis.__reads[0];
	await act(async () => globalThis.__setIdentity({ selectedOrganization: 'org-2' }));
	await act(async () => globalThis.__setIdentity({ selectedOrganization: 'org' }));
	const secondVisit = globalThis.__reads.at(-1);
	assert.notEqual(secondVisit, firstVisit);
	const readsBefore = globalThis.__reads.length;

	await act(async () => firstVisit({ running: true, duration: 99, lastLog: null }));
	assert.equal(seen.shared.status, null);
	await act(async () => {
		seen.shared.refetch();
	});
	assert.equal(
		globalThis.__reads.length,
		readsBefore,
		'a refresh waits for the pending read instead of starting another'
	);

	await act(async () => secondVisit({ running: false, duration: 4, lastLog: null }));
	assert.equal(seen.shared.status?.duration, 4);
});

test('signing out during a read ends the loading state', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	assert.equal(seen.shared.loading, true);

	await act(async () => globalThis.__setIdentity({ token: '' }));

	assert.equal(seen.shared.loading, false);
});

test('a refresh queued during a read waits while the page is hidden, and reads once it is visible', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	const pending = globalThis.__reads[0];
	await act(async () => {
		seen.shared.refetch();
	});

	visibility = 'hidden';
	await act(async () => pending({ running: false, duration: 0, lastLog: null }));
	assert.equal(globalThis.__reads.length, 1);

	visibility = 'visible';
	await act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
	assert.equal(globalThis.__reads.length, 2);
});

test('a focus event on a hidden page reads nothing', async () => {
	await reset();
	await mount([widget('a')]);
	await answer(0, {});

	visibility = 'hidden';
	await act(async () => window.dispatchEvent(new window.Event('focus')));

	assert.equal(globalThis.__reads.length, 1);
});

test('a refresh kept from before a switch of organization reads nothing, and the new read still sets the status', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	await answer(0, {});
	const refetchForOldOrganization = seen.shared.refetch;

	await act(async () => globalThis.__setIdentity({ selectedOrganization: 'org-2' }));
	const forNewOrganization = globalThis.__reads.at(-1);
	await act(async () => {
		refetchForOldOrganization();
	});
	assert.equal(globalThis.__reads.at(-1), forNewOrganization, 'the old refresh starts no read');

	await act(async () => forNewOrganization({ running: false, duration: 7, lastLog: null }));
	assert.equal(seen.shared.status?.duration, 7);
	assert.equal(seen.shared.loading, false);
});

test('a refresh queued during a read reads nothing once the last timer widget is gone', async () => {
	await reset();
	let refetch;
	const Refresher = () => {
		refetch = useTimerStatusContext().refetch;
		return null;
	};
	const refresher = React.createElement(Refresher, { key: 'r' });
	const { root } = await mount([widget('a'), refresher]);
	const pending = globalThis.__reads[0];
	await act(async () => {
		refetch();
	});

	await act(async () => root.render(React.createElement(TimerStatusProvider, null, refresher)));
	await act(async () => pending({ running: false, duration: 0, lastLog: null }));

	assert.equal(globalThis.__reads.length, 1);
});

// A timer widget as the kit's are: useTimer, with its start and stop.
function timer(key, seen) {
	const Timer = () => {
		seen[key] = useTimer();
		return null;
	};
	return React.createElement(Timer, { key });
}

test('one start at a time for the page: a second click, in the same widget or another, and a stop meanwhile send nothing', async () => {
	await reset();
	mock.timers.enable({ apis: ['setInterval'] });
	try {
		const seen = {};
		await mount([timer('a', seen), timer('b', seen)]);
		assert.equal(globalThis.__reads.length, 1, 'two timers, one read');
		await answer(0, { running: false });

		await act(async () => {
			seen.a.startTimer();
			seen.a.startTimer();
			seen.b.startTimer();
			seen.b.stopTimer();
		});
		assert.deepEqual(
			globalThis.__actions.map((a) => a.kind),
			['start']
		);
		assert.deepEqual([seen.a.timerLoading, seen.b.timerLoading], [true, true]);

		await act(async () => globalThis.__actions[0]({ id: 'log' }));
		await answer(1, { running: true, lastLog: { startedAt: new Date().toISOString() } });
		assert.deepEqual([seen.a.isRunning, seen.b.isRunning], [true, true]);
		assert.deepEqual([seen.a.timerLoading, seen.b.timerLoading], [false, false]);
		assert.equal(seen.b.timerActionLabel, 'TIME_TRACKER.STOP_TIMER');

		await act(async () => {
			seen.b.stopTimer();
		});
		assert.deepEqual(
			globalThis.__actions.map((a) => a.kind),
			['start', 'stop']
		);
	} finally {
		mock.timers.reset();
	}
});

test('a running timer widget leaves no interval behind once unmounted', async () => {
	await reset();
	const live = new Set();
	const { setInterval: realSet, clearInterval: realClear } = globalThis;
	globalThis.setInterval = (...args) => {
		const id = realSet(...args);
		live.add(id);
		return id;
	};
	globalThis.clearInterval = (id) => {
		live.delete(id);
		return realClear(id);
	};
	try {
		const seen = {};
		const { root } = await mount([timer('a', seen)]);
		await answer(0, { running: true, lastLog: { startedAt: new Date().toISOString() } });
		assert.equal(seen.a.isRunning, true);

		await act(async () => root.unmount());
		roots.splice(roots.indexOf(root), 1);
		assert.equal(live.size, 0);
	} finally {
		for (const id of live) realClear(id);
		globalThis.setInterval = realSet;
		globalThis.clearInterval = realClear;
	}
});

test('outside a provider, useTimerStatus reads again with a new token at once, and polls with it', async () => {
	await reset();
	mock.timers.enable({ apis: ['setInterval'] });
	try {
		const user = { id: 'u', tenantId: 't', employee: { id: 'e' } };
		const Standalone = ({ token }) => {
			useTimerStatus(user, token, 'org');
			return null;
		};
		const container = document.createElement('div');
		const root = createRoot(container);
		roots.push(root);
		await act(async () => root.render(React.createElement(Standalone, { token: 'first' })));
		assert.deepEqual(
			globalThis.__reads.map((r) => r.token),
			['first']
		);

		await act(async () => root.render(React.createElement(Standalone, { token: 'second' })));
		await act(async () => mock.timers.tick(60_000));
		assert.deepEqual(
			globalThis.__reads.map((r) => r.token),
			['first', 'second', 'second']
		);
	} finally {
		mock.timers.reset();
	}
});

test('a read refused with 401 says the session ended, a 403 that the permission is missing, and a good read clears it', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	await act(async () => globalThis.__reads[0]({ statusCode: 401, message: 'Unauthorized' }));
	assert.equal(seen.shared.notice?.kind, 'session');

	await act(async () => window.dispatchEvent(new window.Event('online')));
	await act(async () => globalThis.__reads[1]({ statusCode: 403, message: 'Forbidden', code: 'EMBED_SCOPE' }));
	assert.equal(seen.shared.notice?.kind, 'permission');

	await act(async () => window.dispatchEvent(new window.Event('online')));
	await answer(2, {});
	assert.equal(seen.shared.notice, null);
});

test('a read with no answer says the site is not allowed when the API is up, and unreachable when it is down', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	await act(async () => globalThis.__reads[0].reject(new TypeError('Failed to fetch')));
	await flush();
	assert.equal(seen.shared.notice?.kind, 'origin');
	assert.deepEqual(globalThis.__probes[0], { url: 'http://api.test/api', mode: 'no-cors' });

	globalThis.__apiDown = true;
	await act(async () => window.dispatchEvent(new window.Event('online')));
	await act(async () => globalThis.__reads[1].reject(new TypeError('Failed to fetch')));
	await flush();
	assert.equal(seen.shared.notice?.kind, 'unreachable');
});

test('going offline says at once that Ever Teams is unreachable, and the screen reader hears it', async () => {
	await reset();
	const seen = {};
	const { container } = await mount([probe(seen)]);
	await answer(0, {});

	await act(async () => window.dispatchEvent(new window.Event('offline')));

	assert.equal(seen.shared.notice?.kind, 'unreachable');
	assert.match(container.querySelector('[aria-live]').textContent, /KIT_ERRORS.UNREACHABLE/);
});

test('a refusal with its own message keeps that message', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	await act(async () => globalThis.__reads[0]({ statusCode: 400, message: ['organizationId must be a UUID'] }));

	assert.deepEqual(seen.shared.notice, { kind: 'other', message: 'organizationId must be a UUID' });
});

test('a read the API package returns with no status (its shape for a request with no answer) is probed, not shown as its raw text', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	await act(async () => globalThis.__reads[0]({ error: 'Failed to fetch' }));
	await flush();
	assert.equal(seen.shared.notice?.kind, 'origin');

	globalThis.__apiDown = true;
	await act(async () => window.dispatchEvent(new window.Event('online')));
	await act(async () => globalThis.__reads[1]({ error: 'Failed to fetch' }));
	await flush();
	assert.equal(seen.shared.notice?.kind, 'unreachable');
	assert.equal(globalThis.__toasts.length, 0);
});

// One timer widget and what the provider gives it, the first read answered and a start clicked (still pending).
async function clickStart() {
	await reset();
	const seen = {};
	await mount([timer('a', seen), probe(seen)]);
	await answer(0, { running: false });
	await act(async () => {
		seen.a.startTimer();
	});
	return seen;
}

test('a start the API package returns with no status shows the probed notice inside the widgets, and no toast', async () => {
	const seen = await clickStart();
	await act(async () => globalThis.__actions[0]({ error: 'Failed to fetch' }));
	await flush();

	assert.equal(seen.shared.notice?.kind, 'origin');
	assert.equal(globalThis.__toasts.length, 0);
});

test('a start refused after a switch of organization shows nothing in the widgets of the new one', async () => {
	const seen = await clickStart();
	await act(async () => globalThis.__setIdentity({ selectedOrganization: 'org-2' }));
	const forNewOrganization = globalThis.__reads.at(-1);
	await act(async () => forNewOrganization({ running: false, duration: 0, lastLog: null }));
	await act(async () => globalThis.__actions[0]({ statusCode: 403, message: 'Forbidden' }));
	await flush();

	assert.equal(seen.shared.notice, null);
});

test('a notice that goes away leaves the live region, so the same failure later is announced again', async () => {
	await reset();
	const seen = {};
	const { container } = await mount([probe(seen)]);
	const live = container.querySelector('[aria-live="polite"]');
	await act(async () => globalThis.__reads[0]({ statusCode: 503, message: 'Service Unavailable' }));
	assert.equal(live.textContent, 'KIT_ERRORS.UNREACHABLE');

	await act(async () => window.dispatchEvent(new window.Event('online')));
	await answer(1, {});
	assert.equal(seen.shared.notice, null);
	assert.equal(live.textContent, '');

	await act(async () => window.dispatchEvent(new window.Event('online')));
	await act(async () => globalThis.__reads[2]({ statusCode: 503, message: 'Service Unavailable' }));
	assert.equal(live.textContent, 'KIT_ERRORS.UNREACHABLE');
});

// useAuthUser as TeamsProvider runs it, with the page's notice next to it (jotai's default store here).
async function mountAuthUser(token, seen) {
	const AuthUser = () => {
		seen.user = useAuthUser(token);
		seen.notice = useAtomValue(kitNoticeAtom);
		return null;
	};
	const root = createRoot(document.createElement('div'));
	roots.push(root);
	await act(async () => root.render(React.createElement(AuthUser)));
}

test('a user read that finds Ever Teams unreachable reads again once back online, and the good read ends the notice', async () => {
	await reset();
	globalThis.__apiDown = true;
	const seen = {};
	await mountAuthUser('token-1', seen);
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
	await reset();
	const seen = {};
	await mountAuthUser('token-2', seen);

	await act(async () => globalThis.__userReads[0]({ statusCode: 401, message: 'Unauthorized' }));
	await flush();
	assert.equal(seen.notice?.kind, 'session');

	await act(async () => window.dispatchEvent(new window.Event('online')));
	assert.equal(globalThis.__userReads.length, 1);
});
