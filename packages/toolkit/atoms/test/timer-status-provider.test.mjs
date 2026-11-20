// TimerStatusProvider, useTimer and useManualTimeForm: `yarn test` in packages/toolkit/atoms
// (node --test test/*.test.mjs).
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
	// A test can hold the probe's answer back.
	await globalThis.__probeHeld;
	if (globalThis.__apiDown) throw new TypeError('Failed to fetch');
	return {};
};
let visibility = 'visible';
Object.defineProperty(dom.window.document, 'visibilityState', { get: () => visibility });

// The API package's own rule of a timer change, from its sources: the stand-in below re-exports it.
const apiTimerChange = path
	.join(here, '..', '..', '..', 'api', 'src', 'lib', 'client', 'timer-change.ts')
	.replaceAll('\\', '/');

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
		// A start or stop, with what it was sent: startTimer(user, token, teamsState, organizationId).
		const action = (kind) => (...args) =>
			new Promise((resolve, reject) => globalThis.__actions.push(Object.assign(resolve, { kind, args, reject })));
		export const startTimer = action('start');
		export const stopTimer = action('stop');
		globalThis.__slots = 0;
		export const addTimeSlot = async () => {
			globalThis.__slots += 1;
		};
		globalThis.__userReads = [];
		export const getUser = ({ token }) =>
			new Promise((resolve) => globalThis.__userReads.push(Object.assign(resolve, { token })));
		globalThis.__logins = [];
		export const authLogin = () => new Promise((resolve) => globalThis.__logins.push(resolve));
		export const apiConfigManager = { getConfig: () => ({ apiUrl: 'http://api.test/api' }) };
		globalThis.__manualTimes = [];
		export const addManualTime = ({ body }) =>
			new Promise((resolve, reject) => globalThis.__manualTimes.push(Object.assign(resolve, { body, reject })));
		export const ApiCall = () => new Promise(() => {});
		export { timerChangeOf } from '${apiTimerChange}';`,
	'@ever-teams/toolkit-ui': `
		globalThis.__toasts = [];
		export const toast = (t) => globalThis.__toasts.push(t);
		// The kit's reportError shows a toast too.
		export const reportError = (description) => globalThis.__toasts.push({ variant: 'destructive', description });
		export const getErrorMessage = (error) => String(error);`,
	// The atoms useAuthUser and the sign-in form use, without the rest of the kit's atoms.
	'teams-atoms': `
		import { atom } from 'jotai';
		export const userAtom = atom({ data: null, loading: false });
		export const selectedEmployeeAtom = atom('all');
		export const accessTokenAtom = atom('');
		export const userOrganizationsAtom = atom({ data: null, loading: false });`,
	// The two enums the manual time form sends; the rest of the package is types.
	'@ever-teams/toolkit-types': `
		export const LogType = { MANUAL: 'MANUAL' };
		export const TimerSource = { TEAMS: 'TEAMS' };`,
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });',
	// The manual time form's read of the organizations builds its query with qs; the API call itself is stubbed.
	qs: "export default { stringify: () => '' };"
};
const stubbed = /^(@ever-teams\/api|@ever-teams\/toolkit-ui|@ever-teams\/toolkit-types|react-i18next|qs)$/;
// The provider imports its context as ./teams-context, the sign-in form as ../context/teams-context and useTimer as
// @lib/context/teams-context: one stub for all.
const teamsContext = /^(\.\/teams-context|\.\.\/context\/teams-context|@lib\/context\/teams-context)$/;
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
let usePasswordLoginForm;
let useManualTimeForm;
let userAtom;
let KitOptionsProvider;
let useTeamsStopWatch;
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
				"export { usePasswordLoginForm } from './hooks/usePasswordLoginForm';",
				"export { useManualTimeForm } from './hooks/useManualTimeForm';",
				"export { userAtom } from './teams-jotai/atoms/teams-atoms';",
				"export { KitOptionsProvider } from './components/teams-provider/kit-options';",
				"export { useTeamsStopWatch } from './hooks/useTeamsStopWatch';",
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
		usePasswordLoginForm,
		useManualTimeForm,
		userAtom,
		KitOptionsProvider,
		useTeamsStopWatch
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
async function mount(widgets, props = null) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => root.render(React.createElement(TimerStatusProvider, props, ...widgets)));
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
	globalThis.__logins.length = 0;
	globalThis.__manualTimes.length = 0;
	globalThis.__probeHeld = undefined;
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

// Runs `check` with the intervals the page starts counted: `live` holds those not cleared yet. Any left are cleared
// after it, even when an assertion fails.
async function withLiveIntervals(check) {
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
		await check(live);
	} finally {
		for (const id of live) realClear(id);
		globalThis.setInterval = realSet;
		globalThis.clearInterval = realClear;
	}
}

test('a running timer widget leaves no interval behind once unmounted', async () => {
	await reset();
	await withLiveIntervals(async (live) => {
		const seen = {};
		const { root } = await mount([timer('a', seen)]);
		await answer(0, { running: true, lastLog: { startedAt: new Date().toISOString() } });
		assert.equal(seen.a.isRunning, true);

		await act(async () => root.unmount());
		roots.splice(roots.indexOf(root), 1);
		assert.equal(live.size, 0);
	});
});

test('a start that answers once its timer widget is gone leaves no interval behind', async () => {
	await reset();
	await withLiveIntervals(async (live) => {
		const seen = {};
		const { root } = await mount([timer('a', seen)]);
		await answer(0, { running: false });
		await act(async () => {
			seen.a.startTimer();
		});

		await act(async () => root.unmount());
		roots.splice(roots.indexOf(root), 1);
		await act(async () => globalThis.__actions[0]({ id: 'log' }));
		await flush();

		assert.equal(live.size, 0);
	});
});

test("the stopwatch starts from its caller's own layout effect at mount", async () => {
	await reset();
	await withLiveIntervals(async (live) => {
		const seen = {};
		function Clock() {
			const watch = useTeamsStopWatch({ duration: 0, lastLog: null, running: false });
			seen.watch = watch;
			React.useLayoutEffect(() => {
				watch.start();
			}, []);
			return null;
		}
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		await act(async () => root.render(React.createElement(Clock)));

		assert.equal(seen.watch.isRunning, true);
		assert.equal(live.size, 1);
		await act(async () => root.unmount());
		assert.equal(live.size, 0);
	});
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

test('a new token for the same person keeps the status on screen until the next read', async () => {
	await reset();
	let latest;
	await mount([widget('a', (s) => (latest = s))]);
	await answer(0, { running: true, duration: 42, lastLog: null });
	assert.equal(latest?.duration, 42);

	await act(async () => globalThis.__setIdentity({ token: 'renewed-token' }));
	assert.equal(latest?.duration, 42, 'no flash back to an empty timer every few minutes');
	const renewed = globalThis.__reads.find((r) => r.token === 'renewed-token');
	assert.ok(renewed, 'the status is read again with the new token');

	await act(async () => renewed({ running: true, duration: 43, lastLog: null }));
	assert.equal(latest?.duration, 43);
});

test('with the host signing people in, a stop sends no time slot: the stop already recorded the time', async () => {
	await reset();
	globalThis.__slots = 0;
	const seen = {};
	const container = document.createElement('div');
	const root = createRoot(container);
	roots.push(root);
	const host = (hostSignIn) =>
		React.createElement(
			KitOptionsProvider,
			{ value: { scoped: true, hostSignIn } },
			React.createElement(TimerStatusProvider, null, timer('a', seen))
		);
	await act(async () => root.render(host(true)));
	await answer(0, { running: true, lastLog: { startedAt: new Date().toISOString() } });

	await act(async () => {
		seen.a.stopTimer();
	});
	await act(async () => globalThis.__actions[0]({ id: 'log' }));
	await flush();
	assert.equal(globalThis.__slots, 0);
	// The stop refreshes the status; that read's answer ends the action.
	await answer(1, { running: true, lastLog: { startedAt: new Date().toISOString() } });

	await act(async () => root.render(host(false)));
	await act(async () => {
		seen.a.stopTimer();
	});
	await act(async () => globalThis.__actions[1]({ id: 'log' }));
	await flush();
	assert.equal(globalThis.__slots, 1, 'without it, as before');
});

test('a failed sign-in shows its message in the form, unless the person edited a field while it was checked', async () => {
	await reset();
	const seen = {};
	const SignIn = () => {
		seen.form = usePasswordLoginForm({});
		return null;
	};
	const root = createRoot(document.createElement('div'));
	roots.push(root);
	await act(async () => root.render(React.createElement(SignIn)));
	const submit = () => seen.form.handleSubmit({ preventDefault() {} });
	const edit = (value) => seen.form.handleInputChange({ target: { name: 'email', value } });

	await act(async () => {
		submit();
	});
	await act(async () => globalThis.__logins[0]({ message: 'Failed to fetch' }));
	await flush();
	assert.equal(seen.form.error, 'KIT_ERRORS.ORIGIN');

	await act(async () => edit('a@b.c'));
	let release;
	globalThis.__probeHeld = new Promise((resolve) => (release = resolve));
	await act(async () => {
		submit();
	});
	await act(async () => globalThis.__logins[1]({ message: 'Failed to fetch' }));
	await act(async () => edit('a@b.co'));
	release();
	await flush();
	assert.equal(seen.form.error, undefined);
	assert.equal(seen.form.loading, false);
});

// A sign-out that keeps the page (scopedStyles or onSignOut) leaves the widgets mounted; another account signs in.
const OTHER_ACCOUNT = {
	authenticatedUser: { id: 'u-2', tenantId: 't', employee: { id: 'e-2' } },
	token: 'token-2',
	selectedOrganization: 'org'
};
const NOTHING_PICKED = { taskId: null, projectId: null, organizationTeamId: null, clientId: null };

async function signOutAndInAsAnotherAccount() {
	await act(async () => globalThis.__setIdentity({ authenticatedUser: null, token: '', selectedOrganization: '' }));
	await act(async () => globalThis.__setIdentity(OTHER_ACCOUNT));
}

test('after a sign-out that keeps the page, another account with no time starts with its own task, project and team', async () => {
	await reset();
	const seen = {};
	await mount([timer('a', seen)]);
	const lastLog = {
		taskId: 'task-1',
		projectId: 'project-1',
		organizationTeamId: 'team-1',
		organizationContactId: 'c-1'
	};
	await answer(0, { running: false, duration: 7200, lastLog });
	assert.deepEqual(seen.a.currentTeamsState, {
		taskId: 'task-1',
		projectId: 'project-1',
		organizationTeamId: 'team-1',
		clientId: 'c-1'
	});
	assert.equal(seen.a.todayTrackedTime.totalSeconds, 7200);

	await signOutAndInAsAnotherAccount();
	// The new account has recorded nothing: its status states no last entry and no time today.
	await act(async () => globalThis.__reads.at(-1)({ running: false, duration: 0, lastLog: null }));
	assert.deepEqual(seen.a.currentTeamsState, NOTHING_PICKED);
	assert.equal(seen.a.todayTrackedTime.totalSeconds, 0);

	await act(async () => {
		seen.a.startTimer();
	});
	const [start] = globalThis.__actions;
	assert.equal(start.kind, 'start');
	const [user, token, teamsState, organizationId] = start.args;
	assert.deepEqual([user?.id, token, organizationId], ['u-2', 'token-2', 'org']);
	assert.deepEqual(teamsState, NOTHING_PICKED);
});

test('what a person picks in a timer survives the next read of their own status, which states no last entry', async () => {
	await reset();
	const seen = {};
	await mount([timer('a', seen)]);
	await answer(0, { running: false, duration: 0, lastLog: null });
	const picked = { taskId: 'task-1', projectId: 'project-1', organizationTeamId: 'team-1', clientId: null };
	await act(async () => seen.a.setCurrentTeamsState(picked));

	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await answer(1, { running: false, duration: 0, lastLog: null });

	assert.deepEqual(seen.a.currentTeamsState, picked);
});

// The manual time form, as the kit's form uses it.
async function mountManualTimeForm(seen) {
	const Form = () => {
		seen.form = useManualTimeForm();
		return null;
	};
	const root = createRoot(document.createElement('div'));
	roots.push(root);
	await act(async () => root.render(React.createElement(Form)));
}

// Yesterday from nine to ten, so the hours never lie in the future whatever time the test runs.
async function pickYesterdayMorning(seen) {
	await act(async () => {
		seen.form.setDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
		seen.form.handleTimeChange('start', '09:00');
		seen.form.handleTimeChange('end', '10:00');
	});
}

// The hours a new form starts with: the ten minutes up to now, rounded down to five minutes.
function defaultHoursAt(time) {
	const now = new Date(time);
	now.setMinutes(Math.floor(now.getMinutes() / 5) * 5, 0, 0);
	const start = new Date(now.getTime() - 10 * 60 * 1000);
	const hhmm = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
	return [hhmm(start), hhmm(now)];
}

test('after a sign-out that keeps the page, the manual time form sends nothing the previous account picked or typed', async () => {
	await reset();
	const seen = {};
	await mountManualTimeForm(seen);
	await pickYesterdayMorning(seen);
	await act(async () => {
		seen.form.setCurrentTeamsState({
			taskId: 'task-1',
			projectId: 'project-1',
			organizationTeamId: 'team-1',
			clientId: 'c-1'
		});
		seen.form.setDescription('Notes of the first account');
		seen.form.setIsBillable(false);
	});

	const before = Date.now();
	await signOutAndInAsAnotherAccount();
	const after = Date.now();
	// A new form: today, and the hours it starts with (read on either side of the switch, in case a minute turned).
	assert.equal(seen.form.isToday, true);
	const hours = [seen.form.startTime, seen.form.endTime];
	assert.ok(
		[defaultHoursAt(before), defaultHoursAt(after)].some((expected) => expected.join() === hours.join()),
		hours.join()
	);

	await pickYesterdayMorning(seen);
	await act(async () => {
		seen.form.handleSubmit();
	});

	assert.equal(globalThis.__manualTimes.length, 1);
	const { body } = globalThis.__manualTimes[0];
	assert.deepEqual(
		[body.taskId, body.projectId, body.organizationTeamId, body.organizationContactId],
		[undefined, undefined, undefined, undefined]
	);
	assert.deepEqual([body.employeeId, body.description, body.isBillable], ['e-2', '', true]);
	await act(async () => globalThis.__manualTimes[0]({ id: 'manual-log' }));
});

test("a manual time sent before a sign-out leaves the next account's form as it is when it comes back", async () => {
	await reset();
	const seen = {};
	await mountManualTimeForm(seen);
	await pickYesterdayMorning(seen);
	await act(async () => seen.form.setDescription('Notes of the first account'));
	await act(async () => {
		seen.form.handleSubmit();
	});
	assert.equal(seen.form.loading, true);

	await signOutAndInAsAnotherAccount();
	await act(async () => seen.form.setDescription('Notes of the second account'));
	await act(async () => globalThis.__manualTimes[0]({ id: 'manual-log' }));

	assert.equal(seen.form.description, 'Notes of the second account');
	assert.equal(seen.form.loading, false);
	assert.equal(globalThis.__toasts.length, 0);
});

test("a manual time that fails after a sign-out shows no error in the next account's form", async () => {
	await reset();
	const seen = {};
	await mountManualTimeForm(seen);
	await pickYesterdayMorning(seen);
	await act(async () => {
		seen.form.handleSubmit();
	});

	await signOutAndInAsAnotherAccount();
	await act(async () => globalThis.__manualTimes[0].reject(new Error('Failed to fetch')));

	assert.deepEqual(seen.form.errors, []);
	assert.equal(seen.form.loading, false);
	assert.equal(globalThis.__toasts.length, 0);
});

test("a start or a stop that comes back after a switch of account leaves the next account's timer as it is", async () => {
	// A start sent for the first account, answered once the second one is signed in with no timer running.
	const seen = await clickStart();
	await signOutAndInAsAnotherAccount();
	await act(async () => globalThis.__reads.at(-1)({ running: false, duration: 0, lastLog: null }));
	await act(async () => globalThis.__actions[0]({ id: 'log' }));
	assert.equal(seen.a.isRunning, false);

	// A stop sent for the second account, answered once the first one is back with its timer running.
	await act(async () => {
		seen.a.stopTimer();
	});
	const stop = globalThis.__actions.at(-1);
	assert.equal(stop.kind, 'stop');
	await act(async () => globalThis.__setIdentity(null));
	await act(async () =>
		globalThis.__reads.at(-1)({ running: true, lastLog: { startedAt: new Date().toISOString() } })
	);
	assert.equal(seen.a.isRunning, true);
	await act(async () => stop({ id: 'slot' }));

	assert.equal(seen.a.isRunning, true);
});

test('a start that comes back after a new token for the same account still shows in the widget', async () => {
	const seen = await clickStart();
	await act(async () => globalThis.__setIdentity({ token: 'token-refreshed' }));
	await act(async () => globalThis.__reads.at(-1)({ running: false, duration: 0, lastLog: null }));

	await act(async () => globalThis.__actions[0]({ id: 'log' }));

	assert.equal(seen.a.isRunning, true);
});

test('a stop that comes back after a switch to another account and back leaves the timer read since as it is', async () => {
	await reset();
	const seen = {};
	await mount([timer('a', seen)]);
	const running = { running: true, lastLog: { startedAt: new Date().toISOString() } };
	await answer(0, running);
	await act(async () => {
		seen.a.stopTimer();
	});
	const [stop] = globalThis.__actions;

	await act(async () => globalThis.__setIdentity(OTHER_ACCOUNT));
	await act(async () => globalThis.__setIdentity(null));
	await act(async () => globalThis.__reads.at(-1)(running));
	assert.equal(seen.a.isRunning, true);
	await act(async () => stop({ id: 'slot' }));

	assert.equal(seen.a.isRunning, true);
});

test('a start refused after a switch to another account and back shows nothing in the widgets', async () => {
	const seen = await clickStart();
	await act(async () => globalThis.__setIdentity(OTHER_ACCOUNT));
	await act(async () => globalThis.__setIdentity(null));
	await act(async () => globalThis.__reads.at(-1)({ running: false, duration: 0, lastLog: null }));

	await act(async () => globalThis.__actions[0]({ statusCode: 403, message: 'Forbidden' }));
	await flush();

	assert.equal(seen.shared.notice, null);
});

// onTimerChange: what the host hears of the reads the provider already makes.
const STARTED_AT = '2026-11-18T09:00:00.000Z';
const runningOn = (projectId) => ({
	running: true,
	duration: 60,
	lastLog: { startedAt: STARTED_AT, projectId, taskId: null, isRunning: true }
});

function hostListener() {
	const heard = [];
	const onTimerChange = (change) => heard.push(change);
	return { heard, onTimerChange };
}

test('the host hears the first read, then a start and a stop made elsewhere, once each', async () => {
	await reset();
	const { heard, onTimerChange } = hostListener();
	await mount([widget('a')], { onTimerChange });
	await answer(0, { running: false });
	assert.deepEqual(heard, [{ running: false, startedAt: null, projectId: null, taskId: null, initial: true }]);

	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await answer(1, { running: false });
	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await answer(2, runningOn('project-1'));
	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await answer(3, runningOn('project-1'));
	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await answer(4, { running: false });

	assert.equal(globalThis.__reads.length, 5, 'no read of its own: the focus reads only');
	assert.deepEqual(heard.slice(1), [
		{ running: true, startedAt: STARTED_AT, projectId: 'project-1', taskId: null, initial: false },
		{ running: false, startedAt: null, projectId: null, taskId: null, initial: false }
	]);
});

test('the host hears another running entry: the timer restarted on another project between two reads', async () => {
	await reset();
	const { heard, onTimerChange } = hostListener();
	await mount([widget('a')], { onTimerChange });
	await answer(0, runningOn('project-1'));
	await act(async () => window.dispatchEvent(new window.Event('online')));
	await answer(1, runningOn('project-2'));

	assert.deepEqual(
		heard.map(({ projectId, initial }) => ({ projectId, initial })),
		[
			{ projectId: 'project-1', initial: true },
			{ projectId: 'project-2', initial: false }
		]
	);
});

test('the host hears the reads of the one-minute poll, and none while the page is hidden', async () => {
	await reset();
	mock.timers.enable({ apis: ['setInterval'] });
	try {
		const { heard, onTimerChange } = hostListener();
		await mount([widget('a')], { onTimerChange });
		await answer(0, { running: false });
		await act(async () => mock.timers.tick(60_000));
		await answer(1, runningOn('project-1'));
		visibility = 'hidden';
		await act(async () => mock.timers.tick(180_000));

		assert.equal(globalThis.__reads.length, 2);
		assert.deepEqual(
			heard.map(({ running }) => running),
			[false, true]
		);
	} finally {
		mock.timers.reset();
	}
});

test('a start made in a kit widget reaches the host from the read that follows it', async () => {
	await reset();
	const { heard, onTimerChange } = hostListener();
	const seen = {};
	await mount([timer('a', seen)], { onTimerChange });
	await answer(0, { running: false });
	await act(async () => {
		seen.a.startTimer();
	});
	await act(async () => globalThis.__actions[0]({ id: 'log' }));
	await act(async () => globalThis.__reads.at(-1)(runningOn('project-1')));

	assert.deepEqual(
		heard.map(({ running, initial }) => ({ running, initial })),
		[
			{ running: false, initial: true },
			{ running: true, initial: false }
		]
	);
});

test('a failed read tells the host nothing, and the next answer is its first', async () => {
	await reset();
	const { heard, onTimerChange } = hostListener();
	await mount([widget('a')], { onTimerChange });
	await act(async () => globalThis.__reads[0]({ statusCode: 503, message: 'Service Unavailable' }));
	await flush();
	assert.deepEqual(heard, []);

	await act(async () => window.dispatchEvent(new window.Event('online')));
	await answer(1, runningOn('project-1'));

	assert.equal(heard.length, 1);
	assert.equal(heard[0].initial, true);
});

test('another organization: its first read is told as a first one, and the old answer is never told', async () => {
	await reset();
	const { heard, onTimerChange } = hostListener();
	await mount([widget('a')], { onTimerChange });
	const forOldOrganization = globalThis.__reads[0];
	await act(async () => globalThis.__setIdentity({ selectedOrganization: 'org-2' }));
	const forNewOrganization = globalThis.__reads.find((read) => read.organizationId === 'org-2');

	await act(async () => forOldOrganization(runningOn('project-1')));
	await act(async () => forNewOrganization({ running: false, duration: 0, lastLog: null }));

	assert.deepEqual(
		heard.map(({ running, initial }) => ({ running, initial })),
		[{ running: false, initial: true }]
	);
});

test('a host callback that throws leaves the kit reading and the widgets showing the timer', async () => {
	await reset();
	mock.timers.enable({ apis: ['setTimeout'] });
	try {
		let calls = 0;
		const onTimerChange = () => {
			calls += 1;
			throw new Error('host bug');
		};
		let latest;
		await mount([widget('a', (status) => (latest = status))], { onTimerChange });
		await answer(0, { running: false });
		await act(async () => window.dispatchEvent(new window.Event('focus')));
		await answer(1, runningOn('project-1'));

		assert.equal(calls, 2);
		assert.equal(latest?.running, true);
		assert.equal(globalThis.__reads.length, 2);
	} finally {
		mock.timers.reset();
	}
});

test('a callback given after the first read hears the next read as its first', async () => {
	await reset();
	const { heard, onTimerChange } = hostListener();
	const { root } = await mount([widget('a')]);
	await answer(0, runningOn('project-1'));
	await act(async () => root.render(React.createElement(TimerStatusProvider, { onTimerChange }, widget('a'))));
	assert.deepEqual(heard, [], 'a new callback makes no read');

	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await answer(1, runningOn('project-1'));

	assert.equal(globalThis.__reads.length, 2);
	assert.deepEqual(
		heard.map(({ running, initial }) => ({ running, initial })),
		[{ running: true, initial: true }]
	);
});

test('a read that settles after the provider is removed tells its host nothing', async () => {
	await reset();
	const { heard, onTimerChange } = hostListener();
	const { root } = await mount([widget('a')], { onTimerChange });
	await answer(0, { running: false });
	await act(async () => window.dispatchEvent(new window.Event('focus')));

	await act(async () => root.unmount());
	roots.splice(roots.indexOf(root), 1);
	await answer(1, runningOn('project-1'));

	assert.equal(globalThis.__reads.length, 2);
	assert.deepEqual(
		heard.map(({ running, initial }) => ({ running, initial })),
		[{ running: false, initial: true }]
	);
});

test('a host that changes the change it receives is not told again while the timer stays as it was', async () => {
	await reset();
	const heard = [];
	const onTimerChange = (change) => {
		heard.push({ ...change });
		// A host that shows "no task" in place of null, on the object it received.
		change.taskId = 'shown';
	};
	await mount([widget('a')], { onTimerChange });
	await answer(0, runningOn('project-1'));
	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await answer(1, runningOn('project-1'));

	assert.equal(globalThis.__reads.length, 2);
	assert.deepEqual(
		heard.map(({ taskId, initial }) => ({ taskId, initial })),
		[{ taskId: null, initial: true }]
	);
});

test('the callback of a render that did not commit is never called: a pending read calls the shown one', async () => {
	await reset();
	const shown = hostListener();
	const dropped = hostListener();
	const never = new Promise(() => {});
	// Suspends with no boundary: React keeps the committed render on screen and drops this one.
	function Suspends() {
		throw never;
	}
	const { root } = await mount([widget('a')], { onTimerChange: shown.onTimerChange });
	await act(async () =>
		React.startTransition(() =>
			root.render(
				React.createElement(
					TimerStatusProvider,
					{ onTimerChange: dropped.onTimerChange },
					widget('a'),
					React.createElement(Suspends, { key: 'suspends' })
				)
			)
		)
	);
	await answer(0, { running: false });

	assert.equal(shown.heard.length, 1);
	assert.deepEqual(dropped.heard, []);
});

test('signed out while the timer ran, the provider says it was left running, until someone signs in (#5583)', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	await answer(0, { running: true });
	assert.equal(seen.shared.leftRunning, false);

	await act(async () => globalThis.__setIdentity({ token: '' }));
	assert.equal(seen.shared.leftRunning, true, 'the timer runs on in Ever Teams');

	await act(async () => globalThis.__setIdentity({ token: 'signed-in-again' }));
	assert.equal(seen.shared.leftRunning, false);
});

test('signed out while the timer was stopped, or before any read, nothing is left running', async () => {
	await reset();
	const seen = {};
	await mount([probe(seen)]);
	await answer(0, { running: false });
	await act(async () => globalThis.__setIdentity({ token: '' }));
	assert.equal(seen.shared.leftRunning, false, 'stopped');

	await act(async () => globalThis.__setIdentity({ token: 'another-token' }));
	await act(async () => globalThis.__setIdentity({ token: '' }));
	assert.equal(seen.shared.leftRunning, false, 'no read yet');
});

// A tab whose status is stale: the timer was stopped or started in another tab or app since its last read.
async function staleTimer(running) {
	await reset();
	const seen = {};
	await mount([timer('a', seen), probe(seen)]);
	const lastLog = running ? { startedAt: new Date(Date.now() - 60_000).toISOString() } : null;
	await answer(0, { running, lastLog });
	return seen;
}

test('a stop refused because the timer already stopped elsewhere reads the status again, and keeps the refusal shown', async () => {
	const seen = await staleTimer(true);
	assert.equal(seen.a.isRunning, true);
	const readsBefore = globalThis.__reads.length;

	await act(async () => {
		seen.a.stopTimer();
	});
	await act(async () => globalThis.__actions[0]({ statusCode: 406, message: 'No running log found.' }));
	await flush();
	assert.equal(globalThis.__reads.length, readsBefore + 1, 'the status is read again');
	await answer(readsBefore, { running: false });
	await flush();

	assert.equal(seen.a.isRunning, false, 'the widget shows the timer stopped');
	assert.deepEqual(seen.shared.notice, { kind: 'other', message: 'No running log found.' });
});

test('a start refused because the timer already runs elsewhere reads the status again, and shows it running', async () => {
	const seen = await staleTimer(false);
	const readsBefore = globalThis.__reads.length;

	await act(async () => {
		seen.a.startTimer();
	});
	await act(async () => globalThis.__actions[0]({ statusCode: 409, message: 'The timer is already running.' }));
	await flush();
	assert.equal(globalThis.__reads.length, readsBefore + 1, 'the status is read again');
	await answer(readsBefore, { running: true, lastLog: { startedAt: new Date(Date.now() - 30_000).toISOString() } });
	await flush();

	assert.equal(seen.a.isRunning, true);
	assert.deepEqual(seen.shared.notice, { kind: 'other', message: 'The timer is already running.' });
});

test('a start that got no answer reads nothing more: the network is down, a read would only fail the same way', async () => {
	const seen = await staleTimer(false);
	const readsBefore = globalThis.__reads.length;

	await act(async () => {
		seen.a.startTimer();
	});
	await act(async () => globalThis.__actions[0]({ error: 'Failed to fetch' }));
	await flush();

	assert.equal(globalThis.__reads.length, readsBefore);
	assert.equal(seen.shared.notice?.kind, 'origin');
});
