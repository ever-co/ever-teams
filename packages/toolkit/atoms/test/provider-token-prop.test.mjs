// A token given to TeamsProvider is not read, and the provider says so (ever-co/ever-teams#5635): node --test
// test/*.test.mjs (from packages/toolkit/atoms, after the toolkit-types and api builds). bundle-kit.mjs bundles the
// provider; the console's warnings are recorded.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandInOf, kitStandIns, recordingFetch } from './kit-stand-ins.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const originalWarn = console.warn;
let warnings;
let React;
let act;
let createRoot;
let kit;
let removeBundle;
let root;

before(async () => {
	const bundle = await bundleKit({
		name: 'provider-token-prop',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';`,
		standIns: kitStandIns,
		standInOf: kitStandInOf
	});
	kit = bundle.bundled;
	removeBundle = bundle.remove;
	React = require('react');
	act = React.act;
	createRoot = require('react-dom/client').createRoot;
});

after(() => {
	console.warn = originalWarn;
	removeBundle?.();
});

afterEach(async () => {
	await act(async () => root?.unmount());
	document.body.replaceChildren();
	console.warn = originalWarn;
});

async function openProvider(props) {
	warnings = [];
	console.warn = (message) => warnings.push(String(message));
	globalThis.fetch = recordingFetch([]);
	root = createRoot(document.createElement('div'));
	await act(async () =>
		root.render(
			React.createElement(kit.TeamsProvider, { config: { apiUrl: 'https://api.example.com/api' }, ...props })
		)
	);
}

const aboutToken = () => warnings.filter((message) => message.includes('does not read token'));

test('a provider without token logs nothing about it', async () => {
	await openProvider({});

	assert.deepEqual(aboutToken(), []);
});

test('a provider given a token says, once, that it does not read it and what to use instead', async () => {
	await openProvider({ token: 'a-personal-api-token' });
	await act(async () => root.render(React.createElement(kit.TeamsProvider, { token: 'another-token' })));
	// A second provider on the same page, also given a token, adds no second warning.
	const secondRoot = createRoot(document.createElement('div'));
	await act(async () => secondRoot.render(React.createElement(kit.TeamsProvider, { token: 'a-third-token' })));
	await act(async () => secondRoot.unmount());

	assert.equal(aboutToken().length, 1);
	assert.match(aboutToken()[0], /^@ever-teams\/atoms: .*config\.getToken.*sign-in dialog \(TeamsLoginDialog\)/);
});
