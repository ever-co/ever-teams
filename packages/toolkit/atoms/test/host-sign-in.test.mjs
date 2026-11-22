// Sign-in from the host's backend (config.getToken): node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the provider's session hooks with the kit's atoms and jotai, the API client and toolkit-ui replaced
// by stand-ins; React renders them in jsdom, and node:test's fake timers drive the token's expiry.
import { test, before, after, beforeEach, mock } from 'node:test';
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
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const stubs = {
	'@ever-teams/api': `
		// Every request the hooks send: its path and token.
		globalThis.__requests = [];
		globalThis.__user = { id: 'u', tenantId: 't', employee: { id: 'e', organizationId: 'org-of-employee' } };
		export const getUser = async ({ token }) => {
			globalThis.__requests.push({ path: '/user/me', token });
			return globalThis.__user;
		};
		export const ApiCall = async ({ path, bearer_token }) => {
			globalThis.__requests.push({ path: path.split('?')[0], token: bearer_token });
			return { data: { items: [{ organizationId: 'org-listed', isDefault: true }], total: 1 } };
		};
		export const getTimerStatus = async () => ({});
		export const timerChangeOf = () => null;
		export const apiConfigManager = { getConfig: () => ({ apiUrl: 'http://api.test/api' }) };`,
	'@ever-teams/toolkit-ui': `
		export const getWeekStartAndEnd = () => ({ start: new Date(0), end: new Date(0) });
		export const toast = () => {};`,
	'@ever-teams/toolkit-types': 'export {};',
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });'
};

let React;
let act;
let createRoot;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-sign-in-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const lib = path.join(here, '..', 'src', 'lib').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { useHostToken } from '${lib}/hooks/useHostToken.ts';
		export { useAccessToken } from '${lib}/hooks/useAccessToken.ts';
		export { useAuthUser } from '${lib}/hooks/useAuthUser.ts';
		export { useUserOrganization } from '${lib}/hooks/useUserOrganization.ts';
		export { useSelectedOrganization } from '${lib}/hooks/useSelectedOrganization.ts';
		export { KitOptionsProvider } from '${lib}/components/teams-provider/kit-options.ts';
		export { hostSessionAtom } from '${lib}/session/host-session.ts';
		export * from '${lib}/session/host-token.ts';
		export { kitNoticeAtom } from '${lib}/errors/kit-notice-atom.ts';
		export { accessTokenAtom } from '${lib}/teams-jotai/atoms/teams-atoms.ts';
		export { Provider, createStore } from 'jotai';`
	);
	const outfile = path.join(bundleDir, 'kit.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		// A neutral build reads no main field by default: qs has only main.
		mainFields: ['module', 'main'],
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		// The entry sits in the OS temp folder: packages resolve from the folder that holds the kit's own copies.
		nodePaths: ['jotai', 'qs'].map((name) => path.dirname(path.dirname(require.resolve(`${name}/package.json`)))),
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
					const names =
						/^(@ever-teams\/api|@ever-teams\/toolkit-ui|@ever-teams\/toolkit-types|react-i18next)$/;
					build.onResolve({ filter: names }, (args) => ({ path: args.path, namespace: 'stub' }));
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
	kit = await import(pathToFileURL(outfile).href);
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
	// Only once the link to React is gone: the folder then holds nothing but the bundle.
	if (!fs.existsSync(link)) {
		fs.rmSync(bundleDir, { recursive: true, force: true });
	}
});

beforeEach(async () => {
	for (const root of roots.splice(0)) await act(async () => root.unmount());
	globalThis.__requests.length = 0;
	localStorage.clear();
});

// A token as the API mints them: only its claims matter to the kit.
const tokenFor = (organizationId, n = 1) => {
	const claims = Buffer.from(JSON.stringify({ id: 'u', organizationId, n })).toString('base64url');
	return `header.${claims}.signature`;
};

// The host's getToken: counts its calls; each answers a new token valid `lifetimeMs`.
function hostBackend({ lifetimeMs = 15 * 60_000, fails = false } = {}) {
	const backend = { calls: 0 };
	backend.getToken = async () => {
		backend.calls += 1;
		if (fails) {
			throw new Error('not signed in to the host');
		}
		return {
			token: tokenFor('org-of-token', backend.calls),
			expiresAt: new Date(Date.now() + lifetimeMs).toISOString()
		};
	};
	return backend;
}

// The session part of a TeamsProvider: what TeamsDataProvider runs, in the same order.
async function mount(getToken, { strict = false } = {}) {
	const store = kit.createStore();
	const seen = {};
	const Session = () => {
		seen.refresh = kit.useHostToken(getToken);
		const { accessToken } = kit.useAccessToken();
		const { data: user } = kit.useAuthUser(accessToken);
		const { data: organizations } = kit.useUserOrganization(user, accessToken);
		seen.organizationId = kit.useSelectedOrganization(user, organizations);
		seen.token = accessToken;
		seen.user = user;
		return null;
	};
	let tree = React.createElement(
		kit.KitOptionsProvider,
		{ value: { scoped: true, hostSignIn: Boolean(getToken) } },
		React.createElement(kit.Provider, { store }, React.createElement(Session))
	);
	if (strict) {
		tree = React.createElement(React.StrictMode, null, tree);
	}
	const root = createRoot(document.createElement('div'));
	roots.push(root);
	await act(async () => root.render(tree));
	await settle();
	return { store, seen };
}

// Lets the pending answers and the effects they cause settle.
async function settle() {
	for (let i = 0; i < 5; i += 1) {
		await act(async () => {});
	}
}

const paths = () => globalThis.__requests.map((r) => r.path);

test('the helpers: a minute before expiry, half of a shorter life, and the organization of the claims', () => {
	const now = 1_000_000;
	assert.equal(kit.refreshDelayMs(now + 15 * 60_000, now), 14 * 60_000);
	assert.equal(kit.refreshDelayMs(now + 60_000, now), 30_000);
	assert.equal(kit.refreshDelayMs(now + 1_000, now), kit.MIN_REFRESH_DELAY_MS);
	assert.equal(kit.expiryOf('not a date'), 0);
	assert.equal(kit.organizationOfToken(tokenFor('org-a')), 'org-a');
	assert.equal(kit.organizationOfToken('not-a-token'), null);
	// A token that lives at least MIN_TOKEN_LIFE_MS is renewed before it expires.
	assert.ok(kit.refreshDelayMs(now + kit.MIN_TOKEN_LIFE_MS, now) < kit.MIN_TOKEN_LIFE_MS);
	assert.equal(kit.ownerOfToken(tokenFor('org-a', 1)), kit.ownerOfToken(tokenFor('org-a', 2)));
	assert.notEqual(kit.ownerOfToken(tokenFor('org-a')), kit.ownerOfToken(tokenFor('org-b')));
	assert.equal(kit.ownerOfToken('not-a-token'), 'not-a-token', 'unreadable: never taken for the same person');
});

test('a refused person is told from a signed-out one by the API code their getToken failed with (#5706)', () => {
	const refused = Object.assign(new Error('This member cannot track time through an embed.'), {
		code: 'EMBED_MEMBER_NOT_ALLOWED'
	});
	assert.equal(kit.isRefusedPerson(refused), true);
	assert.equal(kit.isRefusedPerson(Object.assign(new Error('refused'), { code: 'EMBED_ORIGIN_NOT_ALLOWED' })), false);
	assert.equal(kit.isRefusedPerson(new Error('token-url answered 401')), false);
	assert.equal(kit.isRefusedPerson(null), false);
	assert.equal(kit.isRefusedPerson('EMBED_MEMBER_NOT_ALLOWED'), false);
});

test('getToken is called once at start, even under strict mode, and the token stays in memory', async () => {
	const backend = hostBackend();
	const { seen, store } = await mount(backend.getToken, { strict: true });

	assert.equal(backend.calls, 1);
	assert.equal(seen.token, tokenFor('org-of-token', 1));
	assert.equal(store.get(kit.hostSessionAtom).status, 'signed-in');
	assert.equal(localStorage.getItem('_teams-store'), null);
	assert.deepEqual(paths(), ['/user/me']);
	assert.equal(seen.organizationId, 'org-of-token');
});

test('a new token shortly before the old one expires, and the person stays the same', async () => {
	mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
	try {
		const backend = hostBackend();
		const { seen } = await mount(backend.getToken);
		assert.equal(backend.calls, 1);

		await act(async () => mock.timers.tick(14 * 60_000 - 1_000));
		await settle();
		assert.equal(backend.calls, 1);

		await act(async () => mock.timers.tick(2_000));
		await settle();
		assert.equal(backend.calls, 2);
		assert.equal(seen.token, tokenFor('org-of-token', 2));
		assert.deepEqual(paths(), ['/user/me'], 'the same person: the user is not read again');
		assert.equal(localStorage.getItem('_teams-store'), null);
	} finally {
		mock.timers.reset();
	}
});

test('a token the API refuses (401) gets one new token, not one per refused request', async () => {
	const backend = hostBackend();
	const { store } = await mount(backend.getToken);

	await act(async () => store.set(kit.kitNoticeAtom, { kind: 'session' }));
	await settle();
	assert.equal(backend.calls, 2);

	await act(async () => store.set(kit.kitNoticeAtom, { kind: 'session', message: 'again' }));
	await settle();
	assert.equal(backend.calls, 2, 'refused again before any request succeeded: no loop');

	await act(async () => store.set(kit.kitNoticeAtom, null));
	await act(async () => store.set(kit.kitNoticeAtom, { kind: 'session' }));
	await settle();
	assert.equal(backend.calls, 3, 'a later refusal, after a success, asks again');
});

test('a refresh asked while one is pending shares its call', async () => {
	let release;
	const backend = { calls: 0 };
	backend.getToken = () => {
		backend.calls += 1;
		return new Promise((resolve) => {
			release = () => resolve({ token: tokenFor('org-of-token'), expiresAt: Date.now() + 15 * 60_000 });
		});
	};
	const { seen } = await mount(backend.getToken);

	await act(async () => {
		seen.refresh();
		seen.refresh();
	});
	assert.equal(backend.calls, 1);

	await act(async () => release());
	await settle();
	assert.equal(seen.token, tokenFor('org-of-token'));
});

test('a getToken that fails shows the person as signed out, once, with no request to the API', async () => {
	const warnings = [];
	const warn = mock.method(console, 'warn', (message) => warnings.push(message));
	try {
		const backend = hostBackend({ fails: true });
		const { seen, store } = await mount(backend.getToken);

		assert.equal(seen.token, '');
		assert.equal(seen.user, null);
		assert.equal(store.get(kit.hostSessionAtom).status, 'signed-out');
		assert.deepEqual(paths(), []);
		assert.equal(warnings.filter((w) => /getToken failed/.test(w)).length, 1);
	} finally {
		warn.mock.restore();
	}
});

test('a getToken that Ever Teams refused for the person signs out with the refusal, and says so once', async () => {
	const warnings = [];
	const warn = mock.method(console, 'warn', (message) => warnings.push(message));
	try {
		const refused = Object.assign(new Error('This member cannot track time through an embed.'), {
			code: 'EMBED_MEMBER_NOT_ALLOWED'
		});
		const { seen, store } = await mount(async () => {
			throw refused;
		});

		assert.equal(seen.token, '');
		assert.deepEqual(store.get(kit.hostSessionAtom), { status: 'signed-out', organizationId: null, refused: true });
		assert.deepEqual(paths(), []);
		assert.equal(warnings.filter((w) => /getToken failed .*Ever Teams refused this person/.test(w)).length, 1);
	} finally {
		warn.mock.restore();
	}
});

test('a host that signed the person out keeps the signed-out session, with no refusal', async () => {
	const warn = mock.method(console, 'warn', () => {});
	try {
		const backend = hostBackend({ fails: true });
		const { store } = await mount(backend.getToken);

		assert.deepEqual(store.get(kit.hostSessionAtom), { status: 'signed-out', organizationId: null, refused: false });
	} finally {
		warn.mock.restore();
	}
});

test('a token with a past or unreadable expiry is refused, and not asked for again in a loop', async () => {
	mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
	const warn = mock.method(console, 'warn', () => {});
	try {
		for (const expiresAt of [Date.now() - 1_000, 'not a date', Date.now() + 3_000]) {
			const backend = { calls: 0 };
			backend.getToken = async () => {
				backend.calls += 1;
				return { token: tokenFor('org-of-token'), expiresAt };
			};
			const { seen, store } = await mount(backend.getToken);
			assert.equal(seen.token, '');
			assert.equal(store.get(kit.hostSessionAtom).status, 'signed-out');

			await act(async () => mock.timers.tick(60_000));
			await settle();
			assert.equal(backend.calls, 1, `expiresAt ${expiresAt}: no call until the page comes back`);
		}
	} finally {
		warn.mock.restore();
		mock.timers.reset();
	}
});

test('a failed getToken is asked again when the page comes back, a few seconds after the failure', async () => {
	mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
	const warn = mock.method(console, 'warn', () => {});
	try {
		let signedIn = false;
		const backend = { calls: 0 };
		backend.getToken = async () => {
			backend.calls += 1;
			if (!signedIn) {
				throw new Error('not signed in to the host');
			}
			return { token: tokenFor('org-of-token'), expiresAt: Date.now() + 15 * 60_000 };
		};
		const { seen, store } = await mount(backend.getToken);
		assert.equal(store.get(kit.hostSessionAtom).status, 'signed-out');

		signedIn = true;
		await act(async () => window.dispatchEvent(new window.Event('focus')));
		await settle();
		assert.equal(backend.calls, 1, 'right after the failure: no call');

		await act(async () => mock.timers.tick(kit.MIN_REFRESH_DELAY_MS));
		await act(async () => window.dispatchEvent(new window.Event('focus')));
		await settle();
		assert.equal(backend.calls, 2);
		assert.equal(seen.token, tokenFor('org-of-token'));
		assert.equal(store.get(kit.hostSessionAtom).status, 'signed-in');
	} finally {
		warn.mock.restore();
		mock.timers.reset();
	}
});

test('a token for another person starts a new session: the user is read again', async () => {
	const person = (id) =>
		`header.${Buffer.from(JSON.stringify({ id, organizationId: 'org-of-token' })).toString('base64url')}.signature`;
	let next = person('a');
	const backend = { calls: 0 };
	backend.getToken = async () => {
		backend.calls += 1;
		return { token: next, expiresAt: Date.now() + 15 * 60_000 };
	};
	const { seen } = await mount(backend.getToken);
	assert.deepEqual(paths(), ['/user/me']);

	await act(async () => seen.refresh());
	await settle();
	assert.deepEqual(paths(), ['/user/me'], 'the same person: not read again');

	next = person('b');
	await act(async () => seen.refresh());
	await settle();
	assert.equal(seen.token, person('b'));
	assert.deepEqual(
		globalThis.__requests.map((r) => [r.path, r.token]),
		[
			['/user/me', person('a')],
			['/user/me', person('b')]
		]
	);
});

test('without getToken, the stored token and the organization list work as before', async () => {
	localStorage.setItem(
		'_teams-store',
		JSON.stringify({ app: { user: null }, persist: { token: 'stored-token', expiry: Date.now() + 60_000 } })
	);
	const { seen } = await mount(undefined);

	assert.equal(seen.token, 'stored-token');
	assert.deepEqual(paths(), ['/user/me', '/user-organization']);
	assert.equal(seen.organizationId, 'org-listed');
	assert.match(localStorage.getItem('_teams-store'), /stored-token/);
});
