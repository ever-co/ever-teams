// The words of a password or token sign-in this site cannot make (ever-co/ever-teams#5614): node --test test/*.test.mjs
// (from packages/toolkit/atoms, after the toolkit-types and api builds). bundle-kit.mjs bundles the provider and the
// two sign-in hooks; a stand-in fetch plays a browser on a site the API does not answer for sign-in: the sign-in gets
// no answer, and the no-cors probe gets an opaque one while the API is up.
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
const submitted = { preventDefault() {} };

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let root;
const forms = {};

before(async () => {
	const bundle = await bundleKit({
		name: 'sign-in-origin',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { usePasswordLoginForm } from '${kitSources}/hooks/usePasswordLoginForm.ts';
			export { useTokenSubmission } from '${kitSources}/hooks/useTokenSubmission.ts';`,
		standIns: kitStandIns,
		standInOf: kitStandInOf
	});
	kit = bundle.bundled;
	removeBundle = bundle.remove;
	React = require('react');
	act = React.act;
	createRoot = require('react-dom/client').createRoot;
});

after(() => removeBundle?.());

afterEach(async () => {
	await act(async () => root?.unmount());
	document.body.replaceChildren();
	localStorage.clear();
});

// A browser on this site: every sign-in request gets no answer; the probe gets one while the API is up.
const browserOnThisSite =
	({ apiUp }) =>
	async (url, init) => {
		const isProbe = init?.mode === 'no-cors';
		if (isProbe && apiUp) {
			return new Response(null, { status: 200 });
		}
		const path = new URL(url).pathname.replace(/^\/api/, '');
		const isSignIn = path.startsWith('/auth/') || path.startsWith('/user/me');
		if (isProbe || isSignIn) {
			throw new TypeError('Failed to fetch');
		}
		return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
	};

function SignInForms() {
	forms.password = kit.usePasswordLoginForm({});
	forms.token = kit.useTokenSubmission();
	return null;
}

async function signInBothWays(apiUp) {
	globalThis.fetch = browserOnThisSite({ apiUp });
	const container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	const tree = React.createElement(kit.TeamsProvider, { config: { apiUrl: API } }, React.createElement(SignInForms));
	await act(async () => root.render(tree));
	await act(async () => forms.password.handleSubmit(submitted));
	await act(async () => forms.token.handleInputChange({ target: { value: 'pasted-token' } }));
	await act(async () => forms.token.handleSubmit(submitted));
}

test('a sign-in this site cannot make sends nobody to the workspace admin, in both forms', async () => {
	await signInBothWays(true);

	assert.equal(forms.password.error, 'KIT_ERRORS.SIGN_IN_ORIGIN');
	assert.equal(forms.token.error, 'KIT_ERRORS.SIGN_IN_ORIGIN');
});

test('an API that does not answer at all keeps its own words in both forms', async () => {
	await signInBothWays(false);

	assert.equal(forms.password.error, 'KIT_ERRORS.UNREACHABLE');
	assert.equal(forms.token.error, 'KIT_ERRORS.UNREACHABLE');
});
