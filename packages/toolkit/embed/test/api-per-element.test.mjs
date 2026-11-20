// Each <ever-teams-timer> of a page talks to its own api-url (ever-co/ever-teams#5483): yarn test in
// packages/toolkit/embed, which builds toolkit-types and the api package first.
// The atoms package's bundle-kit.mjs bundles the element with TeamsProvider and the kit's hooks from the atoms sources
// and the built @ever-teams/api; the sign-in dialog and the timer are stand-ins built on the kit's own hooks, and the UI
// packages those of kit-stand-ins.mjs. React renders the elements in jsdom, and a stand-in fetch records every request.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { bundleKit, kitSources } from '../../atoms/test/bundle-kit.mjs';
import { kitStandInOf, kitStandIns, recordingFetch, tokenCheckingServers } from '../../atoms/test/kit-stand-ins.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
for (const name of Object.getOwnPropertyNames(dom.window)) {
	if (!(name in globalThis)) {
		globalThis[name] = dom.window[name];
	}
}
for (const name of ['Event', 'CustomEvent', 'EventTarget']) {
	globalThis[name] = dom.window[name];
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// Node has a localStorage of its own, empty without --localstorage-file: the kit keeps its session in the page's.
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const element = path.join(here, '..', 'src', 'index.ts').replaceAll('\\', '/');
const standIns = {
	'@ever-teams/atoms': `import { createElement } from 'react';
		import { usePasswordLoginForm } from '${kitSources}/hooks/usePasswordLoginForm.ts';
		import { useTimer } from '${kitSources}/hooks/useTimer.ts';
		export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
		export { useSiteSignIn } from '${kitSources}/session/site-sign-in-context.ts';
		export { endSiteSignIn } from '${kitSources}/session/site-session.ts';
		export const TeamsLoginDialog = () => {
			const form = usePasswordLoginForm({});
			return createElement('button', { 'data-sign-in': '', onClick: form.handleSubmit }, 'Sign In');
		};
		export const TeamsBasicTimer = () => {
			useTimer();
			return null;
		};`,
	'@ever-teams/atoms/styles.css?inline': 'export default "";'
};
const standInOf = (importPath) => {
	const name = Object.keys(standIns).find((key) => importPath === key);
	if (name) {
		return name;
	}
	return kitStandInOf(importPath);
};

let act;
let pageConfig;
let removeBundle;
let requests;

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'api-per-element',
		entry: `export * from '${element}';
			export { apiConfigManager } from '@ever-teams/api';`,
		standIns: { ...kitStandIns, ...standIns },
		standInOf,
		external: ['react-dom/client', '@emotion/react', '@emotion/cache']
	});
	pageConfig = bundled.apiConfigManager;
	removeBundle = remove;
	({ act } = require('react'));
});

// The elements unmount their kit in a microtask after removal, inside act: their timers stop polling.
async function removeElements() {
	await act(async () => {
		document.body.innerHTML = '';
	});
}

after(async () => {
	await removeElements();
	removeBundle?.();
});

beforeEach(async () => {
	await removeElements();
	localStorage.clear();
	requests = [];
	globalThis.fetch = recordingFetch(requests);
});

async function place(apiUrl) {
	const timer = document.createElement('ever-teams-timer');
	if (apiUrl) {
		timer.setAttribute('api-url', apiUrl);
	}
	await act(async () => document.body.appendChild(timer));
	return timer;
}

// Lets the reads that follow a sign-in (permissions, organizations, timer status) run and settle.
async function settle() {
	for (let round = 0; round < 10; round += 1) {
		await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
	}
}

async function signInOn(timer) {
	requests.length = 0;
	const signIn = timer.shadowRoot.querySelector('[data-sign-in]');
	await act(async () => signIn.click());
	await settle();
}

const hosts = () => new Set(requests.map(({ host }) => host));
const requestsTo = (path) => requests.filter((request) => request.path === path);

test('two elements with two api-url each send the sign-in and the timer to their own server', async () => {
	const first = await place('https://a.example.com/api');
	const second = await place('https://b.example.com/api');

	await signInOn(first);
	assert.equal(requestsTo('/auth/login').length, 1);
	assert.ok(requestsTo('/timesheet/timer/status').length > 0, 'the timer reads its status');
	assert.deepEqual(hosts(), new Set(['a.example.com']));

	await signInOn(second);
	assert.equal(requestsTo('/auth/login').length, 1);
	assert.ok(requestsTo('/timesheet/timer/status').length > 0, 'the timer reads its status');
	assert.deepEqual(hosts(), new Set(['b.example.com']));
});

test('an element without api-url follows the address the page holds, and never changes it', async () => {
	pageConfig.setConfig({ apiUrl: 'https://host.example.com/api' });
	const plain = await place();
	assert.equal(pageConfig.getConfig().apiUrl, 'https://host.example.com/api');

	await signInOn(plain);
	assert.equal(requestsTo('/auth/login').length, 1);
	assert.deepEqual(hosts(), new Set(['host.example.com']));

	// Another element points at a self-hosted API, which becomes the page's address; it starts signed out.
	localStorage.clear();
	await place('https://teams.example.org/api');
	await signInOn(plain);
	assert.equal(requestsTo('/auth/login').length, 1);
	assert.deepEqual(hosts(), new Set(['teams.example.org']));

	await act(async () => plain.setAttribute('color-scheme', 'dark'));
	assert.equal(pageConfig.getConfig().apiUrl, 'https://teams.example.org/api');
});

test('two elements on two api-url keep their own saved sessions when the page loads again', async () => {
	// Servers that refuse (401) a token they did not issue, as a real API does.
	const servers = tokenCheckingServers();
	globalThis.fetch = servers.fetch;
	const signedIn = (host) => servers.requests.filter((request) => request.host === host && request.authorized);
	const refused = () => servers.requests.filter(({ status }) => status === 401);
	// The page again: new elements with nothing in memory, the browser's storage as it was. The element placed last
	// sets the page's address: A.
	const loadPage = async () => {
		await removeElements();
		servers.requests.length = 0;
		const elements = [await place('https://b.example.com/api'), await place('https://a.example.com/api')];
		await settle();
		return elements;
	};

	const [, first] = await loadPage();
	await signInOn(first);
	const [second] = await loadPage();
	assert.ok(signedIn('a.example.com').length > 0, 'A reads the person with its saved session');
	assert.deepEqual(signedIn('b.example.com'), [], "A's session never reaches B");
	assert.deepEqual(refused(), []);

	await signInOn(second);
	await loadPage();
	assert.ok(signedIn('a.example.com').length > 0, 'A is still signed in');
	assert.ok(signedIn('b.example.com').length > 0, 'B reads the person with its own saved session');
	assert.deepEqual(refused(), []);
});

test("another token-url while the first route has not answered: the first route's late token is never used (#5596)", async () => {
	const claims = (n) =>
		Buffer.from(JSON.stringify({ id: 'user-1', organizationId: 'org-1', n })).toString('base64url');
	const tokenFor = (n) => `header.${claims(n)}.signature`;
	const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
	const answer = (n) => new Response(JSON.stringify({ token: tokenFor(n), expiresAt }), { status: 200 });
	let releaseFirst;
	const sentWith = [];
	const recording = recordingFetch(requests);
	globalThis.fetch = (url, init) => {
		const address = String(url);
		if (address === '/first/token') {
			return new Promise((resolve) => {
				releaseFirst = () => resolve(answer(1));
			});
		}
		if (address === '/second/token') {
			return Promise.resolve(answer(2));
		}
		sentWith.push(new Headers(init?.headers).get('authorization'));
		return recording(url, init);
	};
	const timer = await place('https://a.example.com/api');

	await act(async () => timer.setAttribute('token-url', '/first/token'));
	await settle();
	await act(async () => timer.setAttribute('token-url', '/second/token'));
	await settle();
	await act(async () => releaseFirst());
	await settle();

	assert.ok(sentWith.includes(`Bearer ${tokenFor(2)}`), 'the second route signs the person in');
	assert.ok(!sentWith.includes(`Bearer ${tokenFor(1)}`), "the first route's late token is never used");
});

test('signOut() with token-url drops the token: the route is asked again, and its 401 leaves no request with the token (#5596)', async () => {
	const claims = Buffer.from(JSON.stringify({ id: 'user-1', organizationId: 'org-1' })).toString('base64url');
	const token = `header.${claims}.signature`;
	const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
	let signedIn = true;
	let routeAsked = 0;
	const sentWith = [];
	const recording = recordingFetch(requests);
	globalThis.fetch = (url, init) => {
		if (String(url) === '/api/ever-teams-token') {
			routeAsked += 1;
			if (!signedIn) {
				return Promise.resolve(new Response('{}', { status: 401 }));
			}
			return Promise.resolve(new Response(JSON.stringify({ token, expiresAt }), { status: 200 }));
		}
		sentWith.push(new Headers(init?.headers).get('authorization'));
		return recording(url, init);
	};
	const timer = await place('https://a.example.com/api');
	await act(async () => timer.setAttribute('token-url', '/api/ever-teams-token'));
	await settle();
	assert.ok(sentWith.includes(`Bearer ${token}`), 'the route signs the person in');

	// The page signs its own user out, then the timers.
	signedIn = false;
	await act(async () => timer.signOut());
	await settle();
	sentWith.length = 0;
	// The timer reads its status again when the page gets the focus back: signed in, with the token it holds.
	await act(async () => window.dispatchEvent(new Event('focus')));
	await settle();

	assert.equal(routeAsked, 2, 'the new session asks the route again');
	assert.ok(!sentWith.includes(`Bearer ${token}`), 'no request carries the token after signOut()');
});
