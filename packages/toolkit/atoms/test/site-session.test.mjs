// The session of a sign-in with Ever Teams (src/lib/session/site-session.ts, ever-co/ever-teams#5528): node --test
// test/*.test.mjs (from packages/toolkit/atoms, after the toolkit-types and api builds). bundle-kit.mjs bundles it with
// the built @ever-teams/api; a stand-in fetch answers /embed/renew and /embed/revoke, and two sessions of one address
// stand for two tabs of the site, which share jsdom's localStorage and Node's Web Locks.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;

const API = 'https://api.example.com/api';
const LOCK_PREFIX = 'ever-teams:renewal:';

let kit;
let removeBundle;
let api;

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'site-session',
		entry: `export { createSiteSession, KitSiteSignedOut } from '${kitSources}/session/site-session.ts';
			export { readStoredRenewal, saveStoredRenewal } from '${kitSources}/session/stored-session.ts';`,
		standIns: {},
		standInOf: () => undefined
	});
	kit = bundled;
	removeBundle = remove;
});

after(() => {
	removeBundle?.();
});

const renewalTokenFor = (n) => `gzr_renewal-${n}`;

const json = (status, body) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// The API: each renewal answers the next pair, unless `refuse` answers instead; `hold` keeps a renewal waiting.
function standInApi() {
	const stand = { requests: [], pairs: 1, refuse: null, hold: null };
	stand.fetch = async (url, init) => {
		const path = new URL(url).pathname.replace(/^\/api/, '');
		const authorization = new Headers(init.headers).get('authorization');
		stand.requests.push({ path, body: JSON.parse(init.body), authorization });
		if (path === '/embed/revoke') {
			return new Response(null, { status: 204 });
		}
		await stand.hold?.();
		if (stand.refuse) {
			return stand.refuse();
		}
		stand.pairs += 1;
		return json(200, {
			token: `timer-${stand.pairs}`,
			expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
			renewalToken: renewalTokenFor(stand.pairs),
			renewalExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()
		});
	};
	return stand;
}

beforeEach(() => {
	localStorage.clear();
	api = standInApi();
	globalThis.fetch = api.fetch;
});

const saveRenewal = (n) =>
	kit.saveStoredRenewal(API, { renewalToken: renewalTokenFor(n), expiresAt: Date.now() + 60_000 });
const sent = (path) => api.requests.filter((request) => request.path === path);
const presented = () => sent('/embed/renew').map(({ body }) => body.renewalToken);
const hasLock = () => Object.keys(localStorage).some((key) => key.startsWith(LOCK_PREFIX));

// Two tabs ask for a token at once, the first renewal held until `release`.
async function twoTabsRenew() {
	saveRenewal(1);
	const tabs = [kit.createSiteSession(API), kit.createSiteSession(API)];
	let release;
	api.hold = () => new Promise((resolve) => (release = resolve));
	const answers = Promise.all(tabs.map((tab) => tab.getToken()));
	await new Promise((resolve) => setTimeout(resolve, 300));
	const waiting = sent('/embed/renew').length;
	const lockedMeanwhile = hasLock();
	api.hold = null;
	release();
	return { waiting, lockedMeanwhile, answers: await answers };
}

test('nothing saved: the person is signed out, and no request is sent', async () => {
	const session = kit.createSiteSession(API);

	await assert.rejects(session.getToken(), (error) => error instanceof kit.KitSiteSignedOut);
	assert.deepEqual(api.requests, []);
});

test('the tokens the popup handed over: the timer token once, then renewals with the saved renewal token', async () => {
	const session = kit.createSiteSession(API);
	session.accept({
		token: 'timer-1',
		expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
		renewalToken: renewalTokenFor(1),
		renewalExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()
	});

	assert.equal((await session.getToken()).token, 'timer-1');
	assert.deepEqual(api.requests, [], 'no renewal for the handed token');
	assert.equal(localStorage.getItem('_teams-store').includes('timer-1'), false, 'the timer token is never stored');

	assert.equal((await session.getToken()).token, 'timer-2');
	assert.deepEqual(presented(), [renewalTokenFor(1)]);
	assert.equal(sent('/embed/renew')[0].authorization, null, 'no Authorization header');
	assert.equal(kit.readStoredRenewal(API).renewalToken, renewalTokenFor(2), 'the new one replaces it');
});

test('two tabs renew one after the other with Web Locks: each renewal token is presented once', async () => {
	const { waiting, answers } = await twoTabsRenew();

	assert.equal(waiting, 1, 'the second tab waits for the first');
	assert.deepEqual(presented(), [renewalTokenFor(1), renewalTokenFor(2)]);
	assert.deepEqual(
		answers.map(({ token }) => token),
		['timer-2', 'timer-3']
	);
	assert.equal(hasLock(), false, 'Web Locks write nothing to the storage');
});

test('without Web Locks, a lock in localStorage serializes the tabs, and is released', async () => {
	assert.equal(typeof navigator.locks?.request, 'function', 'Node has Web Locks');
	Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
	try {
		const { waiting, lockedMeanwhile } = await twoTabsRenew();

		assert.equal(waiting, 1, 'the second tab waits for the first');
		assert.ok(lockedMeanwhile, 'the lock is in the storage while a tab renews');
		assert.deepEqual(presented(), [renewalTokenFor(1), renewalTokenFor(2)]);
		assert.equal(hasLock(), false, 'released');
	} finally {
		delete navigator.locks;
	}
});

test('a lock left by a closed tab lapses', async () => {
	Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
	try {
		saveRenewal(1);
		localStorage.setItem(`${LOCK_PREFIX}${API}`, JSON.stringify({ owner: 'closed-tab', until: Date.now() - 1 }));

		assert.equal((await kit.createSiteSession(API).getToken()).token, 'timer-2');
	} finally {
		delete navigator.locks;
	}
});

test('an ended sign-in (EMBED_GRANT_ENDED) is forgotten; a refusal the API lifts later keeps the token', async () => {
	saveRenewal(1);
	api.refuse = () => json(403, { statusCode: 403, code: 'EMBED_SITE_SIGN_IN_OFF', message: 'Off.' });
	await assert.rejects(kit.createSiteSession(API).getToken(), { code: 'EMBED_SITE_SIGN_IN_OFF' });
	assert.equal(kit.readStoredRenewal(API).renewalToken, renewalTokenFor(1), 'kept');

	api.refuse = () => json(401, { statusCode: 401, code: 'EMBED_GRANT_ENDED', message: 'Ended.' });
	await assert.rejects(kit.createSiteSession(API).getToken(), { code: 'EMBED_GRANT_ENDED' });
	assert.equal(kit.readStoredRenewal(API), null, 'forgotten');
});

test('sign-out revokes the sign-in, then forgets it, also when the API cannot be reached', async () => {
	saveRenewal(1);
	await kit.createSiteSession(API).signOut();

	const [revocation] = sent('/embed/revoke');
	assert.deepEqual(revocation.body, { renewalToken: renewalTokenFor(1) });
	assert.equal(revocation.authorization, null, 'no Authorization header');
	assert.equal(kit.readStoredRenewal(API), null);

	saveRenewal(2);
	globalThis.fetch = async () => {
		throw new TypeError('Failed to fetch');
	};
	await kit.createSiteSession(API).signOut();
	assert.equal(kit.readStoredRenewal(API), null, 'forgotten all the same');
});

test('a renewal token is saved for its API address only', async () => {
	saveRenewal(1);

	assert.equal(kit.readStoredRenewal('https://other.example.com/api'), null);
	await assert.rejects(kit.createSiteSession('https://other.example.com/api').getToken(), (error) => {
		return error instanceof kit.KitSiteSignedOut;
	});
	assert.deepEqual(api.requests, []);
});
