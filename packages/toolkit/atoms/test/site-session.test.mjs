// The session of a sign-in with Ever Teams (src/lib/session/site-session.ts, ever-co/ever-teams#5528): node --test
// test/*.test.mjs (from packages/toolkit/atoms, after the toolkit-types and api builds). bundle-kit.mjs bundles it with
// the built @ever-teams/api; a stand-in fetch answers /embed/renew and /embed/revoke, and two sessions of one address
// and organization stand for two tabs of the site, which share jsdom's localStorage and Node's Web Locks.
import { test, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;

const API = 'https://api.example.com/api';
const ORGANIZATION = 'org-1';
const LOCK_PREFIX = 'ever-teams:renewal:';

let kit;
let removeBundle;
let api;

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'site-session',
		entry: `export { createSiteSession, endSiteSignIn, KitSiteSignedOut, SIGN_OUT_RENEWAL_WAIT_MS } from '${kitSources}/session/site-session.ts';
			export { apiConfigManager } from '@ever-teams/api';
			export {
				readStoredRenewal,
				saveStoredRenewal,
				siteSignInScopeOf
			} from '${kitSources}/session/stored-session.ts';`,
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

const tokensFor = (n) => ({
	token: `timer-${n}`,
	expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
	renewalToken: renewalTokenFor(n),
	renewalExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()
});

// The API: each renewal answers the next pair, unless `refuse` answers instead; `hold` keeps a renewal waiting, and
// `holdRevoke` a revoke.
function standInApi() {
	const stand = { requests: [], pairs: 1, refuse: null, hold: null, holdRevoke: null };
	stand.fetch = async (url, init) => {
		const path = new URL(url).pathname.replace(/^\/api/, '');
		const authorization = new Headers(init.headers).get('authorization');
		stand.requests.push({ path, body: JSON.parse(init.body), authorization });
		if (path === '/embed/revoke') {
			await stand.holdRevoke?.();
			return new Response(null, { status: 204 });
		}
		await stand.hold?.();
		if (stand.refuse) {
			return stand.refuse();
		}
		stand.pairs += 1;
		return json(200, tokensFor(stand.pairs));
	};
	return stand;
}

beforeEach(() => {
	localStorage.clear();
	api = standInApi();
	globalThis.fetch = api.fetch;
});

const saveRenewal = (n, organizationId = ORGANIZATION) =>
	kit.saveStoredRenewal(API, organizationId, { renewalToken: renewalTokenFor(n), expiresAt: Date.now() + 60_000 });
const savedRenewal = (organizationId = ORGANIZATION) => kit.readStoredRenewal(API, organizationId);
const newTab = (organizationId = ORGANIZATION) => kit.createSiteSession(API, organizationId);
const sent = (path) => api.requests.filter((request) => request.path === path);
const presented = () => sent('/embed/renew').map(({ body }) => body.renewalToken);
const hasLock = () => Object.keys(localStorage).some((key) => key.startsWith(LOCK_PREFIX));
const storedValues = () => Object.keys(localStorage).map((key) => localStorage.getItem(key));

// Lets the answers and the code after them run.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

// Two tabs ask for a token at once, the first renewal held until `release`.
async function twoTabsRenew() {
	saveRenewal(1);
	const tabs = [newTab(), newTab()];
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
	const session = newTab();

	await assert.rejects(session.getToken(), (error) => error instanceof kit.KitSiteSignedOut);
	assert.deepEqual(api.requests, []);
});

test('the tokens the popup handed over: the timer token once, then renewals with the saved renewal token', async () => {
	const session = newTab();
	await session.accept(tokensFor(1));

	assert.equal((await session.getToken()).token, 'timer-1');
	assert.deepEqual(api.requests, [], 'no renewal for the handed token');
	assert.ok(storedValues().length > 0, 'the renewal token is saved');
	assert.equal(
		storedValues().some((value) => value.includes('timer-1')),
		false,
		'the timer token is never stored'
	);
	assert.equal(localStorage.getItem('_teams-store'), null, "the password sessions' record is not touched");

	assert.equal((await session.getToken()).token, 'timer-2');
	assert.deepEqual(presented(), [renewalTokenFor(1)]);
	assert.equal(sent('/embed/renew')[0].authorization, null, 'no Authorization header');
	assert.equal(savedRenewal().renewalToken, renewalTokenFor(2), 'the new one replaces it');
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
		const lockName = `${LOCK_PREFIX}${kit.siteSignInScopeOf(API, ORGANIZATION)}`;
		localStorage.setItem(lockName, JSON.stringify({ owner: 'closed-tab', until: Date.now() - 1 }));

		assert.equal((await newTab().getToken()).token, 'timer-2');
	} finally {
		delete navigator.locks;
	}
});

test('an ended sign-in (EMBED_GRANT_ENDED) is forgotten; a refusal the API lifts later keeps the token', async () => {
	saveRenewal(1);
	api.refuse = () => json(403, { statusCode: 403, code: 'EMBED_SITE_SIGN_IN_OFF', message: 'Off.' });
	await assert.rejects(newTab().getToken(), { code: 'EMBED_SITE_SIGN_IN_OFF' });
	assert.equal(savedRenewal().renewalToken, renewalTokenFor(1), 'kept');

	api.refuse = () => json(401, { statusCode: 401, code: 'EMBED_GRANT_ENDED', message: 'Ended.' });
	await assert.rejects(newTab().getToken(), { code: 'EMBED_GRANT_ENDED' });
	assert.equal(savedRenewal(), null, 'forgotten');
});

test('sign-out revokes the sign-in, then forgets it, also when the API cannot be reached', async () => {
	saveRenewal(1);
	await newTab().signOut();

	const [revocation] = sent('/embed/revoke');
	assert.deepEqual(revocation.body, { renewalToken: renewalTokenFor(1) });
	assert.equal(revocation.authorization, null, 'no Authorization header');
	assert.equal(savedRenewal(), null);

	saveRenewal(2);
	globalThis.fetch = async () => {
		throw new TypeError('Failed to fetch');
	};
	await newTab().signOut();
	assert.equal(savedRenewal(), null, 'forgotten all the same');
});

test('endSiteSignIn ends the sign-in saved for its address and organization, with no timer showing it (#5580)', async () => {
	saveRenewal(1);
	saveRenewal(2, 'org-2');

	await kit.endSiteSignIn({ apiUrl: API, organizationId: ORGANIZATION });

	assert.deepEqual(
		sent('/embed/revoke').map(({ body }) => body),
		[{ renewalToken: renewalTokenFor(1) }]
	);
	assert.equal(savedRenewal(), null);
	assert.equal(savedRenewal('org-2').renewalToken, renewalTokenFor(2), "another organization's sign-in stays");
});

test('endSiteSignIn waits for a renewal another timer runs, then ends the sign-in it saved', async () => {
	saveRenewal(1);
	let release;
	api.hold = () => new Promise((resolve) => (release = resolve));
	const renewing = newTab().getToken();
	await settle();
	const ending = kit.endSiteSignIn({ apiUrl: API, organizationId: ORGANIZATION });
	await settle();

	assert.deepEqual(sent('/embed/revoke'), [], 'nothing ended while the renewal runs');
	api.hold = null;
	release();
	await renewing;
	await ending;

	assert.deepEqual(
		sent('/embed/revoke').map(({ body }) => body),
		[{ renewalToken: renewalTokenFor(2) }]
	);
	assert.equal(savedRenewal(), null, 'the renewed token is not left behind');
});

test(
	'endSiteSignIn does not wait for a renewal that hangs, and forgets what that renewal saves later',
	{ timeout: 30_000 },
	async () => {
		saveRenewal(1);
		let release;
		api.hold = () => new Promise((resolve) => (release = resolve));
		const renewing = newTab().getToken();
		await settle();
		const started = Date.now();

		await kit.endSiteSignIn({ apiUrl: API, organizationId: ORGANIZATION });

		assert.ok(Date.now() - started < kit.SIGN_OUT_RENEWAL_WAIT_MS + 2_000, 'the sign-out ends past the wait');
		assert.equal(savedRenewal(), null, 'forgotten while the renewal hangs');
		assert.deepEqual(
			sent('/embed/revoke').map(({ body }) => body),
			[{ renewalToken: renewalTokenFor(1) }]
		);

		api.hold = null;
		release();
		await renewing.catch(() => undefined);
		await settle();

		assert.equal(savedRenewal(), null, 'what the late renewal saved is forgotten too');
		assert.deepEqual(
			sent('/embed/revoke').map(({ body }) => body),
			[{ renewalToken: renewalTokenFor(1) }, { renewalToken: renewalTokenFor(2) }]
		);
	}
);

test(
	'endSiteSignIn revokes once the lock is released: a revoke that hangs holds no new sign-in',
	{ timeout: 10_000 },
	async () => {
		saveRenewal(1);
		let release;
		api.holdRevoke = () => new Promise((resolve) => (release = resolve));
		const ending = kit.endSiteSignIn({ apiUrl: API, organizationId: ORGANIZATION });
		await settle();
		assert.equal(sent('/embed/revoke').length, 1, 'the revoke is on its way');

		await newTab().accept(tokensFor(5));

		assert.equal(
			savedRenewal().renewalToken,
			renewalTokenFor(5),
			'the next sign-in is saved while the revoke hangs'
		);
		api.holdRevoke = null;
		release();
		await ending;
		assert.deepEqual(
			sent('/embed/revoke').map(({ body }) => body),
			[{ renewalToken: renewalTokenFor(1) }]
		);
		assert.equal(
			savedRenewal().renewalToken,
			renewalTokenFor(5),
			'the revoke of the previous sign-in forgets nothing new'
		);
	}
);

test("endSiteSignIn without an API address ends the sign-in of the page's, as a provider without apiUrl uses", async () => {
	const previous = kit.apiConfigManager.getConfig().apiUrl;
	kit.apiConfigManager.setConfig({ apiUrl: API });
	saveRenewal(3);

	try {
		await kit.endSiteSignIn({ organizationId: ORGANIZATION });
	} finally {
		kit.apiConfigManager.setConfig({ apiUrl: previous });
	}

	assert.deepEqual(
		sent('/embed/revoke').map(({ body }) => body),
		[{ renewalToken: renewalTokenFor(3) }]
	);
	assert.equal(savedRenewal(), null);
});

test('a renewal token is saved for its API address and organization only', async () => {
	saveRenewal(1);

	assert.equal(kit.readStoredRenewal('https://other.example.com/api', ORGANIZATION), null);
	assert.equal(savedRenewal('org-2'), null);
	for (const tab of [kit.createSiteSession('https://other.example.com/api', ORGANIZATION), newTab('org-2')]) {
		await assert.rejects(tab.getToken(), (error) => error instanceof kit.KitSiteSignedOut);
	}
	assert.deepEqual(api.requests, [], "another organization's timer never renews this sign-in");
});

test('a renewal on its way when the person signs out keeps nothing of its answer', async () => {
	saveRenewal(1);
	const session = newTab();
	let release;
	api.hold = () => new Promise((resolve) => (release = resolve));
	const renewal = session.getToken();
	await settle();

	await session.signOut();
	api.hold = null;
	release();

	await assert.rejects(renewal, (error) => error instanceof kit.KitSiteSignedOut);
	assert.equal(savedRenewal(), null, 'the answer is not saved');
	await assert.rejects(session.getToken(), (error) => error instanceof kit.KitSiteSignedOut);
});

test("the popup's answer wins over a renewal of the previous sign-in on its way", async () => {
	saveRenewal(1);
	const session = newTab();
	let release;
	api.hold = () => new Promise((resolve) => (release = resolve));
	const renewal = session.getToken();
	await settle();

	const accepted = session.accept(tokensFor(7));
	api.hold = null;
	release();
	await accepted;

	assert.equal((await renewal).token, 'timer-7', "the renewal's caller gets the popup's timer token");
	assert.equal(savedRenewal().renewalToken, renewalTokenFor(7), "the popup's renewal token is the one saved");
	assert.equal(session.holdsHandedToken(), false);
});

test('a renewal token the browser refused to save is the one presented next, and the spent one is dropped', async () => {
	saveRenewal(1);
	const session = newTab();
	const storage = Object.getPrototypeOf(localStorage);
	const setItem = storage.setItem;
	storage.setItem = function (key, value) {
		if (!key.startsWith(LOCK_PREFIX)) {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		}
		return setItem.call(this, key, value);
	};
	try {
		assert.equal((await session.getToken()).token, 'timer-2');
		assert.equal(savedRenewal(), null, 'the spent token is not left for another tab');

		assert.equal((await session.getToken()).token, 'timer-3');
		assert.deepEqual(presented(), [renewalTokenFor(1), renewalTokenFor(2)], 'each token once');
	} finally {
		storage.setItem = setItem;
	}
});

test('without Web Locks, a lock the browser refuses to write stops the renewal of a shared token', async () => {
	saveRenewal(1);
	Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
	const storage = Object.getPrototypeOf(localStorage);
	const setItem = storage.setItem;
	storage.setItem = () => {
		throw new DOMException('Quota exceeded', 'QuotaExceededError');
	};
	try {
		await assert.rejects(newTab().getToken(), /renewal lock/);
		assert.deepEqual(api.requests, [], 'the saved token is not presented without the lock');
	} finally {
		storage.setItem = setItem;
		delete navigator.locks;
	}
});

test('without Web Locks, a tab whose lock lapsed leaves the lock to the tab that took it over', async () => {
	saveRenewal(1);
	Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
	mock.timers.enable({ apis: ['setInterval'] });
	try {
		const lockName = `${LOCK_PREFIX}${kit.siteSignInScopeOf(API, ORGANIZATION)}`;
		let release;
		api.hold = () => new Promise((resolve) => (release = resolve));
		const renewal = newTab().getToken();
		while (!release) {
			await settle();
		}
		const other = { owner: 'other-tab', until: Date.now() + 60_000 };
		localStorage.setItem(lockName, JSON.stringify(other));

		mock.timers.tick(5_000);
		assert.deepEqual(JSON.parse(localStorage.getItem(lockName)), other, 'the heartbeat leaves it to the other tab');
		api.hold = null;
		release();
		await renewal;
		assert.deepEqual(JSON.parse(localStorage.getItem(lockName)), other, 'and so does the release');
	} finally {
		mock.timers.reset();
		delete navigator.locks;
	}
});
