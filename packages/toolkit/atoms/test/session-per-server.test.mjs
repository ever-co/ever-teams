// A session saved by a sign-in on one server is never read, sent or removed for another (ever-co/ever-teams#5524):
// node --test test/*.test.mjs (from packages/toolkit/atoms, after the toolkit-types and api builds).
// bundle-kit.mjs bundles TeamsProvider and the kit's hooks with the built @ever-teams/api, and the UI packages and
// translations replaced by stand-ins; React renders them in jsdom, whose localStorage outlives a page. The stand-in
// servers refuse a token they did not issue, as a real API does.
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandInOf, kitStandIns, tokenCheckingServers } from './kit-stand-ins.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SERVER_A = 'https://a.example.com/api';
const SERVER_B = 'https://b.example.com/api';
const HOST_A = 'a.example.com';
const HOST_B = 'b.example.com';
const STORE_KEY = '_teams-store';

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let servers;
const roots = [];
// The latest password and token forms of each provider, by its name.
const signIns = {};

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'session-per-server',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { usePasswordLoginForm } from '${kitSources}/hooks/usePasswordLoginForm.ts';
			export { useTokenSubmission } from '${kitSources}/hooks/useTokenSubmission.ts';
			export { UserNavMenu } from '${kitSources}/components/forms/auth-forms.tsx';
			export { KitNotice } from '${kitSources}/components/teams-ui-components/kit-notice.tsx';`,
		standIns: kitStandIns,
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

async function closePage() {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
	document.body.replaceChildren();
}

beforeEach(() => {
	localStorage.clear();
	servers = tokenCheckingServers();
	globalThis.fetch = servers.fetch;
});

afterEach(closePage);

// Lets the reads that follow a sign-in or a stored session (person, permissions, organizations) run and settle.
async function settle() {
	for (let round = 0; round < 10; round += 1) {
		await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
	}
}

function SignIn({ name }) {
	signIns[name] = { password: kit.usePasswordLoginForm({}), token: kit.useTokenSubmission() };
	return null;
}

// A provider with the sign-in form, and its account menu and notice in a section named after it. A sign-out keeps the
// page where it is.
function provider(name, config) {
	const section = React.createElement(
		'section',
		{ 'data-provider': name },
		React.createElement(kit.UserNavMenu),
		React.createElement(kit.KitNotice)
	);
	const props = { key: name, config, onSignOut() {} };
	return React.createElement(kit.TeamsProvider, props, React.createElement(SignIn, { name }), section);
}

// The page: one provider per [name, config], in that order.
async function renderPage(root, providers) {
	const page = providers.map(([name, config]) => provider(name, config));
	await act(async () => root.render(React.createElement(React.Fragment, null, page)));
	await settle();
}

// Another page of the site: the providers start with nothing in memory, the browser's storage stays.
async function openPage(providers) {
	await closePage();
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	servers.requests.length = 0;
	await renderPage(root, providers);
	return root;
}

const bothServers = () => [
	['a', { apiUrl: SERVER_A }],
	['b', { apiUrl: SERVER_B }]
];

const submitted = { preventDefault() {} };

async function signInOn(name) {
	await act(async () => signIns[name].password.handleSubmit(submitted));
	await settle();
}

async function pasteTokenOn(name, token) {
	await act(async () => signIns[name].token.handleInputChange({ target: { value: token } }));
	await act(async () => signIns[name].token.handleSubmit(submitted));
	await settle();
}

const sentTo = (host) => servers.requests.filter((request) => request.host === host);
const authorizedTo = (host) => sentTo(host).filter(({ authorized }) => authorized);
const refusedBy = (host) => sentTo(host).filter(({ status }) => status === 401);
const noticeOf = (name) => document.querySelector(`[data-provider="${name}"] [data-ever-teams-notice]`);
const stored = () => JSON.parse(localStorage.getItem(STORE_KEY));
// A session as the kit saved it before it kept the address of its server.
const savedBeforeAddresses = (token) =>
	JSON.stringify({ app: { user: null }, persist: { token, expiry: Date.now() + 60_000 } });

// The person read back with a session the server accepts: the provider is signed in without a sign-in.
function assertSignedInFromStorage(name, host) {
	const reads = authorizedTo(host).filter(({ path }) => path === '/user/me');
	assert.equal(reads.length, 1, `the provider of ${host} reads the person with its saved session`);
	assert.deepEqual(refusedBy(host), [], `${host} accepts every token it gets`);
	assert.equal(noticeOf(name), null);
}

test('a sign-in on server A is never sent to server B, by a provider next to it or on another page', async () => {
	const root = await openPage([['a', { apiUrl: SERVER_A }]]);
	await signInOn('a');

	servers.requests.length = 0;
	await renderPage(root, bothServers());
	assert.deepEqual(authorizedTo(HOST_B), [], 'no token reaches B');
	assert.equal(noticeOf('b'), null, 'no "Your session ended" for a server nobody signed in to');

	await openPage([
		['b', { apiUrl: SERVER_B }],
		['a', { apiUrl: SERVER_A }]
	]);
	assert.deepEqual(authorizedTo(HOST_B), [], 'no token reaches B');
	assert.equal(noticeOf('b'), null);
	assertSignedInFromStorage('a', HOST_A);
});

test("a token pasted under server B's provider is saved for B, even when the page's address is A", async () => {
	servers.accept(HOST_B, 'pasted-on-b');
	// The provider rendered last sets the page's address: A here.
	await openPage([
		['b', { apiUrl: SERVER_B }],
		['a', { apiUrl: SERVER_A }]
	]);
	await pasteTokenOn('b', 'pasted-on-b');

	await openPage(bothServers());
	assert.deepEqual(authorizedTo(HOST_A), [], "B's token never reaches A");
	assert.equal(noticeOf('a'), null);
	assertSignedInFromStorage('b', HOST_B);
});

test("a session its own server refuses still ends with the notice, on that server's provider only", async () => {
	await openPage(bothServers());
	await signInOn('a');
	await signInOn('b');
	servers.revoke(HOST_B);

	await openPage(bothServers());
	assert.equal(noticeOf('b')?.getAttribute('data-ever-teams-notice'), 'session');
	assert.equal(refusedBy(HOST_B).length, 1);
	assertSignedInFromStorage('a', HOST_A);
});

test('a session saved before the address was kept still signs the person in, then stays with its server', async () => {
	localStorage.setItem(STORE_KEY, savedBeforeAddresses('saved-before'));
	servers.accept(HOST_A, 'saved-before');

	await openPage([['a', { apiUrl: SERVER_A }]]);
	assertSignedInFromStorage('a', HOST_A);
	assert.equal(stored().persist.apiUrl, SERVER_A, 'the provider that read it first keeps it for its address');

	await openPage([
		['b', { apiUrl: SERVER_B }],
		['a', { apiUrl: SERVER_A }]
	]);
	assert.deepEqual(authorizedTo(HOST_B), [], 'never sent to another server after that');
	assert.equal(noticeOf('b'), null);
	assertSignedInFromStorage('a', HOST_A);
});

test("with the host's getToken, nothing is written to the browser's storage, and a saved session stays as it is", async () => {
	const getToken = async () => ({ token: 'from-the-host', expiresAt: Date.now() + 60 * 60 * 1000 });
	servers.accept(HOST_A, 'from-the-host');

	await openPage([['h', { apiUrl: SERVER_A, getToken }]]);
	assert.ok(authorizedTo(HOST_A).length > 0, "the host's token reads the person");
	assert.equal(localStorage.length, 0);

	const saved = savedBeforeAddresses('saved-before');
	localStorage.setItem(STORE_KEY, saved);
	await openPage([['h', { apiUrl: SERVER_A, getToken }]]);
	assert.equal(localStorage.getItem(STORE_KEY), saved, 'neither stamped nor removed');
	assert.equal(localStorage.length, 1);
	assert.deepEqual(refusedBy(HOST_A), [], 'the saved token is not sent');
});
