// Sign-in with Ever Teams (config.signIn 'ever-teams', ever-co/ever-teams#5528): node --test test/*.test.mjs (from
// packages/toolkit/atoms, after the toolkit-types and api builds). bundle-kit.mjs bundles TeamsProvider and the kit's
// hooks with the built @ever-teams/api, the UI packages and translations replaced by stand-ins (the themed button is a
// plain button); React renders them in jsdom. A stand-in fetch answers the API's routes, and a stand-in window.open
// gives the popup, whose messages the test dispatches with the origin, source and state it picks.
import { test, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandInOf, kitStandIns } from './kit-stand-ins.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const API = 'https://api.example.com/api';
const APP = 'https://app.example.com';
const ORGANIZATION = 'org-1';
const SITE = { apiUrl: API, signIn: 'ever-teams', appUrl: APP, organizationId: ORGANIZATION };
const SIGN_IN_LABEL = 'AUTH.sign_in_with_ever_teams';
const LIFETIME_MS = 15 * 60_000;

// The themed button as a plain button, so the test can click it.
const standIns = {
	...kitStandIns,
	'@ever-teams/toolkit-ui': kitStandIns['@ever-teams/toolkit-ui'].replace(
		/export const ThemedButton = [^;]+;/,
		"export const ThemedButton = ({ children, ...props }) => createElement('button', props, children);"
	)
};

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let api;
let popup;
const roots = [];

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'site-sign-in',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { TeamsLoginDialog, UserNavMenu } from '${kitSources}/components/forms/auth-forms.tsx';
			export { readStoredRenewal, saveStoredRenewal } from '${kitSources}/session/stored-session.ts';
			export { useSiteSignIn } from '${kitSources}/session/site-sign-in-context.ts';`,
		standIns,
		standInOf: kitStandInOf
	});
	kit = bundled;
	removeBundle = remove;
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
});

after(() => {
	removeBundle?.();
});

// A token as the API mints them: only its claims matter to the kit.
const tokenFor = (n) => {
	const claims = Buffer.from(JSON.stringify({ id: 'user-1', organizationId: ORGANIZATION, n })).toString('base64url');
	return `header.${claims}.signature`;
};

const renewalTokenFor = (n) => `gzr_renewal-${n}`;

// What the web app posts, or the API answers, for the nth pair.
const tokensFor = (n) => ({
	token: tokenFor(n),
	expiresAt: new Date(Date.now() + LIFETIME_MS).toISOString(),
	renewalToken: renewalTokenFor(n),
	renewalExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()
});

const json = (status, body) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const USER = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: ORGANIZATION } };
const ANSWERS = {
	'/user/me': USER,
	'/timesheet/timer/status': { duration: 0, running: false, lastLog: null }
};

// The API: each renewal answers the next pair, unless `refuseRenewal` answers instead; every request is recorded with
// its path, body and Authorization header.
function standInApi() {
	const stand = { requests: [], pairs: 1, refuseRenewal: null };
	stand.fetch = async (url, init = {}) => {
		const path = new URL(url).pathname.replace(/^\/api/, '');
		let body;
		if (init.body) {
			body = JSON.parse(init.body);
		}
		const authorization = new Headers(init.headers).get('authorization');
		stand.requests.push({ path, body, authorization });
		if (path === '/embed/renew') {
			if (stand.refuseRenewal) {
				return stand.refuseRenewal();
			}
			stand.pairs += 1;
			return json(200, tokensFor(stand.pairs));
		}
		if (path === '/embed/revoke') {
			return new Response(null, { status: 204 });
		}
		return json(200, ANSWERS[path] ?? {});
	};
	return stand;
}

// window.open, giving one popup window; `opened` keeps the address, name and features of each call.
function standInPopup({ blocked = false } = {}) {
	const stand = { opened: [], window: { closed: false, focused: 0 } };
	stand.window.focus = () => {
		stand.window.focused += 1;
	};
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
	localStorage.clear();
	api = standInApi();
	globalThis.fetch = api.fetch;
	popup = standInPopup();
});

afterEach(async () => {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
	document.body.replaceChildren();
});

// Lets the answers and the effects they cause settle, without timers (some tests mock them).
async function settle() {
	for (let round = 0; round < 20; round += 1) {
		await act(async () => {});
	}
}

async function openPage(config = SITE, extra = null) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	const tree = React.createElement(
		kit.TeamsProvider,
		{ config, onSignOut() {} },
		React.createElement(kit.TeamsLoginDialog),
		React.createElement(kit.UserNavMenu),
		extra
	);
	await act(async () => root.render(tree));
	await settle();
	return container;
}

const buttonLabelled = (label) =>
	[...document.querySelectorAll('button')].find((button) => button.textContent.trim() === label);
const signInButton = () => buttonLabelled(SIGN_IN_LABEL);

async function click(button) {
	await act(async () => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
	await settle();
}

// A message to the page, from `origin` and `source` (the popup by default), as the browser dispatches it.
async function post(data, { origin = APP, source = popup.window } = {}) {
	const event = new window.Event('message');
	Object.defineProperties(event, {
		data: { value: data },
		origin: { value: origin },
		source: { value: source }
	});
	await act(async () => window.dispatchEvent(event));
	await settle();
}

// The state the kit put in the address of the popup it opened last, which the web app's page repeats.
const openedState = () => new URL(popup.opened.at(-1).url).searchParams.get('state');
const authorized = (n) => ({ type: 'ever-teams:embed-authorized', state: openedState(), ...tokensFor(n) });
const denied = () => ({ type: 'ever-teams:embed-denied', state: openedState() });
const sent = (path) => api.requests.filter((request) => request.path === path);
const userReadWith = (token) => sent('/user/me').some(({ authorization }) => authorization === `Bearer ${token}`);
const stored = () =>
	Object.keys(localStorage)
		.map((key) => localStorage.getItem(key))
		.join('\n');
const savedRenewal = (organizationId = ORGANIZATION) => kit.readStoredRenewal(API, organizationId);

async function signInThroughPopup(n = 1) {
	await openPage();
	await click(signInButton());
	await post(authorized(n));
}

test('a signed-out person gets the button, which opens the web app on this site and organization', async () => {
	await openPage();

	assert.ok(signInButton(), 'the button shows');
	assert.deepEqual(sent('/embed/renew'), [], 'nothing saved: no renewal');
	assert.equal(document.querySelector('input[type="password"]'), null, 'no password field');

	await click(signInButton());

	assert.equal(popup.opened.length, 1);
	const [{ url, name }] = popup.opened;
	const state = openedState();
	assert.match(state, /^[0-9a-f]{32}$/);
	assert.equal(
		url,
		`${APP}/embed/authorize?origin=http%3A%2F%2Flocalhost&organization=${ORGANIZATION}&state=${state}`
	);
	assert.equal(name, 'ever-teams-sign-in');
	assert.match(document.body.textContent, /AUTH\.site_sign_in_waiting/);
});

test("the popup's tokens sign the person in: the timer token in memory, the renewal token saved for its API", async () => {
	await signInThroughPopup(1);

	assert.ok(userReadWith(tokenFor(1)), 'the person is read with the timer token');
	assert.equal(signInButton(), undefined, 'the button is gone');
	assert.equal(stored().includes(tokenFor(1)), false, 'the timer token is never stored');
	assert.equal(savedRenewal().renewalToken, renewalTokenFor(1));
	assert.equal(
		kit.readStoredRenewal('https://other.example.com/api', ORGANIZATION),
		null,
		'saved for its API address only'
	);
	assert.equal(savedRenewal('org-2'), null, 'and for its organization only');
});

test('a message from another origin, from another window of the web app, or without the state is ignored', async () => {
	await openPage();
	await click(signInButton());

	await post(authorized(1), { origin: 'https://evil.example.com' });
	await post(authorized(1), { source: {} });
	await post(authorized(1), { origin: 'http://localhost', source: window });
	await post({ ...authorized(1), state: 'f'.repeat(32) });

	assert.equal(userReadWith(tokenFor(1)), false);
	assert.equal(savedRenewal(), null);
	assert.ok(signInButton(), 'still signed out');

	await post(authorized(1));
	assert.ok(userReadWith(tokenFor(1)), 'the popup itself, from the web app, signs the person in');
});

test('a second click opens the page again in the same popup, in front; Cancel there leaves the person signed out', async () => {
	await openPage();
	await click(signInButton());
	await click(signInButton());

	assert.equal(popup.opened.length, 2);
	assert.equal(new Set(popup.opened.map(({ name }) => name)).size, 1, 'the same window');
	const pageOf = (url) => url.replace(/&state=[0-9a-f]+$/, '');
	assert.equal(new Set(popup.opened.map(({ url }) => pageOf(url))).size, 1, 'the same page');
	assert.equal(new Set(popup.opened.map(({ url }) => url)).size, 2, 'each opening with a state of its own');
	assert.equal(popup.window.focused, 2);

	await post(denied());

	assert.ok(signInButton());
	assert.doesNotMatch(document.body.textContent, /AUTH\.site_sign_in_waiting/);
	assert.equal(savedRenewal(), null);
});

test('a popup closed without an answer ends the wait', async () => {
	mock.timers.enable({ apis: ['setInterval'] });
	try {
		await openPage();
		await click(signInButton());
		popup.window.closed = true;

		await act(async () => mock.timers.tick(1_000));
		await settle();

		assert.doesNotMatch(document.body.textContent, /AUTH\.site_sign_in_waiting/);
		assert.ok(signInButton());
	} finally {
		mock.timers.reset();
	}
});

test('a blocked popup says to allow pop-ups', async () => {
	popup = standInPopup({ blocked: true });
	await openPage();
	await click(signInButton());

	assert.match(document.body.textContent, /AUTH\.site_sign_in_blocked/);
});

test('a reload stays signed in: the saved renewal token renews at start, and the new one replaces it', async () => {
	await signInThroughPopup(1);
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}

	await openPage();

	const [renewal] = sent('/embed/renew');
	assert.deepEqual(renewal.body, { renewalToken: renewalTokenFor(1) });
	assert.equal(renewal.authorization, null, 'no Authorization header');
	assert.ok(userReadWith(tokenFor(2)));
	assert.equal(savedRenewal().renewalToken, renewalTokenFor(2));
	assert.equal(signInButton(), undefined);
});

test('the next pair is asked for about a minute before the timer token expires', async () => {
	mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
	try {
		await signInThroughPopup(1);
		assert.equal(sent('/embed/renew').length, 0, 'the popup gave the first pair');

		await act(async () => mock.timers.tick(LIFETIME_MS - 61_000));
		await settle();
		assert.equal(sent('/embed/renew').length, 0, 'not yet');

		await act(async () => mock.timers.tick(2_000));
		await settle();
		const renewals = sent('/embed/renew');
		assert.equal(renewals.length, 1);
		assert.deepEqual(renewals[0].body, { renewalToken: renewalTokenFor(1) });
		assert.equal(sent('/user/me').length, 1, 'the same person: not read again');
		assert.equal(savedRenewal().renewalToken, renewalTokenFor(2));

		await act(async () => mock.timers.tick(LIFETIME_MS - 59_000));
		await settle();
		assert.deepEqual(sent('/embed/renew')[1].body, { renewalToken: renewalTokenFor(2) }, 'each token once');
	} finally {
		mock.timers.reset();
	}
});

test('an ended sign-in (EMBED_GRANT_ENDED) is forgotten, and the button shows again', async () => {
	await signInThroughPopup(1);
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
	api.refuseRenewal = () =>
		json(401, { statusCode: 401, code: 'EMBED_GRANT_ENDED', message: "This site's sign-in has ended." });

	await openPage();

	assert.equal(sent('/embed/renew').length, 1);
	assert.equal(savedRenewal(), null, 'forgotten');
	assert.ok(signInButton());
});

test('a refusal the API lifts later (sign-in off) keeps the renewal token for the next try', async () => {
	await signInThroughPopup(1);
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
	api.refuseRenewal = () =>
		json(403, {
			statusCode: 403,
			code: 'EMBED_SITE_SIGN_IN_OFF',
			message: 'People cannot sign in from this site.'
		});

	await openPage();

	assert.equal(savedRenewal().renewalToken, renewalTokenFor(1));
	assert.ok(signInButton());
});

test('sign-out revokes the sign-in at the API, then forgets it, and the button shows again', async () => {
	await signInThroughPopup(1);
	const signOut = buttonLabelled('AUTH.LOGOUT');
	assert.ok(signOut, 'the account menu offers to sign out');

	await click(signOut);

	const [revocation] = sent('/embed/revoke');
	assert.deepEqual(revocation.body, { renewalToken: renewalTokenFor(1) });
	assert.equal(revocation.authorization, null, 'no Authorization header');
	assert.equal(savedRenewal(), null);
	assert.equal(stored().includes('renewal'), false);
	assert.ok(signInButton());
});

test('a provider without signIn keeps the password sign-in and reads no renewal', async () => {
	kit.saveStoredRenewal(API, ORGANIZATION, { renewalToken: renewalTokenFor(1), expiresAt: Date.now() + 60_000 });

	await openPage({ apiUrl: API });

	assert.equal(signInButton(), undefined);
	assert.deepEqual(sent('/embed/renew'), []);
	assert.equal(popup.opened.length, 0);
});

test("a timer set up for another organization does not renew this organization's sign-in", async () => {
	await signInThroughPopup(1);
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}

	await openPage({ ...SITE, organizationId: 'org-2' });

	assert.deepEqual(sent('/embed/renew'), [], 'no renewal with the sign-in allowed for org-1');
	assert.ok(signInButton(), 'the person signs in for org-2');
	assert.equal(savedRenewal().renewalToken, renewalTokenFor(1), "org-1's sign-in stays for org-1's timers");
	await click(signInButton());
	assert.match(popup.opened.at(-1).url, /organization=org-2/);
});

test('a sign-out while the popup waits ends the popup: its later answer signs nobody in (#5580)', async () => {
	let controls = null;
	const Controls = () => {
		controls = kit.useSiteSignIn();
		return null;
	};
	await openPage(SITE, React.createElement(Controls));
	await click(signInButton());

	await act(async () => controls.signOut());
	await settle();
	await post(authorized(1));

	assert.equal(savedRenewal(), null, 'no sign-in saved');
	assert.equal(userReadWith(tokenFor(1)), false, 'the handed token is not used');
	assert.ok(signInButton(), 'the person stays signed out');
	assert.doesNotMatch(document.body.textContent, /AUTH.site_sign_in_waiting/);
});

// The package's entry: a React host signs the person out from its own sign-out, on a shared computer (#5580).
test('the package exports the sign-in controls and the sign-out of a saved sign-in', () => {
	const ts = require('typescript');
	const fs = require('node:fs');
	const entry = new URL('../src/index.ts', import.meta.url);
	const source = ts.createSourceFile('index.ts', fs.readFileSync(entry, 'utf8'), ts.ScriptTarget.ES2022, true);
	const exported = source.statements
		.filter((statement) => ts.isExportDeclaration(statement) && statement.exportClause)
		.flatMap((statement) => statement.exportClause.elements.map((element) => element.name.text));

	for (const name of [
		'useSiteSignIn',
		'SiteSignInControls',
		'SiteSignInStatus',
		'endSiteSignIn',
		'EndSiteSignInOptions'
	]) {
		assert.ok(exported.includes(name), name);
	}
});
