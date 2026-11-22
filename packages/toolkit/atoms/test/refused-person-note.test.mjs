// A person the host signs in from its backend, whom Ever Teams refuses (ever-co/ever-teams#5706): node --test
// test/*.test.mjs (from packages/toolkit/atoms, after the toolkit-types and api builds). bundle-kit.mjs bundles
// TeamsProvider and the sign-in prompt; getToken stands in for the host's backend, which either relays the API's
// refusal of the person (EMBED_MEMBER_NOT_ALLOWED, as the SDK throws it) or says the person is signed out of the host.
import { test, before, after, afterEach } from 'node:test';
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
const PERMISSION = 'KIT_ERRORS.PERMISSION';
const SIGN_IN_NOTE = 'AUTH.host_sign_in';

let React;
let act;
let createRoot;
let kit;
let removeBundle;
const roots = [];

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'refused-person-note',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { TeamsLoginDialog } from '${kitSources}/components/forms/auth-forms.tsx';`,
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

afterEach(async () => {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
	document.body.replaceChildren();
	localStorage.clear();
});

async function settle() {
	for (let round = 0; round < 20; round += 1) {
		await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
	}
}

async function openPage(getToken) {
	globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
	const warn = console.warn;
	console.warn = () => {};
	try {
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		roots.push(root);
		const tree = React.createElement(
			kit.TeamsProvider,
			{ config: { apiUrl: API, getToken }, onSignOut() {} },
			React.createElement(kit.TeamsLoginDialog)
		);
		await act(async () => root.render(tree));
		await settle();
	} finally {
		console.warn = warn;
	}
}

const refusedByEverTeams = async () => {
	throw Object.assign(new Error('This member cannot track time through an embed.'), { code: 'EMBED_MEMBER_NOT_ALLOWED' });
};
const signedOutOfTheHost = async () => {
	throw new Error('token-url answered 401');
};

test('a person Ever Teams refused reads the permission message, not a call to sign in to the site', async () => {
	await openPage(refusedByEverTeams);

	assert.match(document.body.textContent, new RegExp(PERMISSION.replace('.', '\\.')));
	assert.doesNotMatch(document.body.textContent, new RegExp(SIGN_IN_NOTE.replace('.', '\\.')));
});

test('a person signed out of the site keeps the note that points to its sign-in', async () => {
	await openPage(signedOutOfTheHost);

	assert.match(document.body.textContent, new RegExp(SIGN_IN_NOTE.replace('.', '\\.')));
	assert.doesNotMatch(document.body.textContent, new RegExp(PERMISSION.replace('.', '\\.')));
});
