// The popup of a sign-in with Ever Teams (src/lib/session/site-popup.ts, ever-co/ever-teams#5528): node --test
// test/*.test.mjs (from packages/toolkit/atoms). esbuild bundles the module; jsdom's window stands for the site's page,
// with a stand-in window.open, and the test dispatches the popup's messages with the origin and source it picks.
import { test, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://site.example.com/' });
globalThis.window = dom.window;

const APP = 'https://app.example.com';
const SIGN_IN = { appUrl: APP, organizationId: 'org-1' };

let kit;
let removeBundle;
let popup;

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'site-popup',
		entry: `export * from '${kitSources}/session/site-popup.ts';`,
		standIns: {},
		standInOf: () => undefined
	});
	kit = bundled;
	removeBundle = remove;
});

after(() => {
	removeBundle?.();
});

const TOKENS = {
	token: 'timer-1',
	expiresAt: '2026-11-19T10:15:00.000Z',
	renewalToken: 'gzr_renewal-1',
	renewalExpiresAt: '2026-12-19T10:00:00.000Z'
};

// window.open, giving one popup window; `opened` keeps the address, name and features of each call.
function standInPopup({ blocked = false } = {}) {
	const stand = { opened: [], window: { closed: false } };
	window.open = (url, name, features) => {
		stand.opened.push({ url, name, features });
		if (blocked) {
			return null;
		}
		return stand.window;
	};
	return stand;
}

beforeEach(() => {
	mock.timers.enable({ apis: ['setInterval'] });
	popup = standInPopup();
});

afterEach(() => {
	mock.timers.reset();
});

// A message to the page, from `origin` and `source` (the popup by default), as the browser dispatches it.
function post(data, { origin = APP, source = popup.window } = {}) {
	const event = new window.Event('message');
	Object.defineProperties(event, {
		data: { value: data },
		origin: { value: origin },
		source: { value: source }
	});
	window.dispatchEvent(event);
}

// Whether the result settled, and with what.
async function settledResult(opened) {
	const pending = Symbol('pending');
	const nextTurn = new Promise((resolve) => setImmediate(() => resolve(pending)));
	const value = await Promise.race([opened.result, nextTurn]);
	if (value === pending) {
		return null;
	}
	return value;
}

test("the popup opens the web app's page for this site and organization", () => {
	const opened = kit.openSitePopup({ ...SIGN_IN, appUrl: `${APP}/` });

	assert.equal(opened.window, popup.window);
	const [{ url, name, features }] = popup.opened;
	assert.equal(url, `${APP}/embed/authorize?origin=https%3A%2F%2Fsite.example.com&organization=org-1`);
	assert.equal(name, 'ever-teams-sign-in');
	assert.match(features, /popup/);
	assert.doesNotMatch(features, /noopener/, 'the page posts to its opener');
	opened.stop();
});

test('the tokens are taken only from the web app, and only from the popup', async () => {
	const opened = kit.openSitePopup(SIGN_IN);
	const authorized = { type: 'ever-teams:embed-authorized', ...TOKENS };

	post(authorized, { origin: 'https://evil.example.com' });
	post(authorized, { source: {} });
	post(authorized, { origin: 'https://site.example.com', source: window });
	post({ type: 'ever-teams:embed-authorized', token: 'timer-1' });
	assert.equal(await settledResult(opened), null, 'none of these');

	post(authorized);
	assert.deepEqual(await opened.result, { kind: 'authorized', tokens: TOKENS });
});

test("the person's Cancel ends the popup as denied", async () => {
	const opened = kit.openSitePopup(SIGN_IN);

	post({ type: 'ever-teams:embed-denied' });

	assert.deepEqual(await opened.result, { kind: 'denied' });
});

test('a popup closed without a message ends as closed, at the second look, after a message it posted', async () => {
	const opened = kit.openSitePopup(SIGN_IN);
	popup.window.closed = true;

	mock.timers.tick(kit.POPUP_CLOSED_POLL_MS);
	assert.equal(await settledResult(opened), null, 'its last message may still be on its way');
	mock.timers.tick(kit.POPUP_CLOSED_POLL_MS);
	assert.deepEqual(await opened.result, { kind: 'closed' });
});

test('a blocked popup, or an appUrl that is no web address, ends as blocked', async () => {
	popup = standInPopup({ blocked: true });
	assert.deepEqual(await kit.openSitePopup(SIGN_IN).result, { kind: 'blocked' });

	popup = standInPopup();
	assert.deepEqual(await kit.openSitePopup({ ...SIGN_IN, appUrl: 'javascript:alert(1)' }).result, {
		kind: 'blocked'
	});
	assert.equal(popup.opened.length, 0, 'nothing opened');
});

test('stop ends the wait of a provider that leaves the page, and later messages are ignored', async () => {
	const opened = kit.openSitePopup(SIGN_IN);

	opened.stop();
	post({ type: 'ever-teams:embed-authorized', ...TOKENS });

	assert.deepEqual(await opened.result, { kind: 'closed' });
});

test('resultOfMessage reads only the messages of the web app, with all four tokens', () => {
	const { token, expiresAt, renewalToken } = TOKENS;
	assert.equal(kit.resultOfMessage({ type: 'ever-teams:embed-authorized', token, expiresAt, renewalToken }), null);
	assert.equal(kit.resultOfMessage({ type: 'ever-teams:embed-authorized', ...TOKENS, token: 42 }), null);
	assert.equal(kit.resultOfMessage({ type: 'other', ...TOKENS }), null);
	assert.equal(kit.resultOfMessage('ever-teams:embed-denied'), null);
	assert.equal(kit.resultOfMessage(null), null);
	assert.deepEqual(kit.resultOfMessage({ type: 'ever-teams:embed-denied' }), { kind: 'denied' });
});
