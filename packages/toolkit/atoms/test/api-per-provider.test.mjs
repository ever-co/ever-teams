// Each TeamsProvider of a page talks to its own API (ever-co/ever-teams#5483): node --test test/*.test.mjs (from
// packages/toolkit/atoms, after the toolkit-types and api builds).
// bundle-kit.mjs bundles TeamsProvider and the kit's hooks with the built @ever-teams/api, and the UI packages and
// translations replaced by stand-ins; React renders them in jsdom, and a stand-in fetch records every request.
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const passThrough = 'export default ({ children }) => children;';
const standIns = {
	'@ever-teams/toolkit-ui': `import { createContext } from 'react';
		export const PortalContainerContext = createContext(null);
		export const cn = (...names) => names.filter(Boolean).join(' ');
		export const Toaster = () => null;
		export const toast = () => {};
		export const reportError = () => {};
		export const getErrorMessage = (error) => String(error);
		export const getWeekStartAndEnd = () => ({ start: new Date(0), end: new Date(0) });`,
	'theme-ui': `const passThrough = ({ children }) => children;
		export const ThemeUIProvider = passThrough;`,
	'next-themes': `const passThrough = ({ children }) => children;
		export const ThemeProvider = passThrough;
		export const useTheme = () => ({ setTheme() {} });`,
	'react-i18next': `export const useTranslation = () => ({ t: (key) => key });
		export const I18nextProvider = ({ children }) => children;`,
	'@lib/i18n/init': 'export default {};',
	'@hooks/useProviderLanguage': 'export const useProviderLanguage = () => {};',
	'@hooks/useFontSelector': 'export default () => ({ fontOptions: [], selectedFont: "", setSelectedFont() {} });',
	'@lib/context/teams-tracking-context': passThrough
};
// The stand-in an import names, as TeamsProvider writes it.
const standInOf = (importPath) => Object.keys(standIns).find((name) => importPath === name);

const USER = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'org-1' } };
// What the stand-in API answers, by the path under /api; anything else gets an empty object.
const ANSWERS = {
	'/auth/login': { token: 'token-1', refresh_token: 'refresh-1', user: USER },
	'/user/me': USER,
	'/role-permissions/me': [],
	'/user-organization': { items: [{ organizationId: 'org-1', isDefault: true }], total: 1 },
	'/timesheet/timer/status': { duration: 0, running: false, lastLog: null }
};
const SERVER_A = 'https://a.example.com/api';
const SERVER_B = 'https://b.example.com/api';

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let requests;
const roots = [];
// The latest sign-in forms of each provider, by its name.
const signIns = {};

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'api-per-provider',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { usePasswordLoginForm } from '${kitSources}/hooks/usePasswordLoginForm.ts';
			export { useTokenSubmission } from '${kitSources}/hooks/useTokenSubmission.ts';
			export { apiConfigManager } from '@ever-teams/api';`,
		standIns,
		standInOf
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

beforeEach(() => {
	localStorage.clear();
	requests = [];
	globalThis.fetch = async (url, init) => {
		const { host, pathname } = new URL(url);
		const path = pathname.replace(/^\/api/, '');
		requests.push({ host, path, method: init?.method ?? 'GET' });
		const body = ANSWERS[path] ?? {};
		return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};
});

afterEach(async () => {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
});

// What the kit's password and token forms do, for the provider they sit in.
function SignIn({ name }) {
	signIns[name] = { password: kit.usePasswordLoginForm({}), token: kit.useTokenSubmission() };
	return null;
}

function provider(name, config) {
	return React.createElement(kit.TeamsProvider, { key: name, config }, React.createElement(SignIn, { name }));
}

// The page: one provider per [name, config], in that order.
async function renderPage(root, providers) {
	const page = providers.map(([name, config]) => provider(name, config));
	await act(async () => root.render(React.createElement(React.Fragment, null, page)));
}

async function openPage(providers) {
	const root = createRoot(document.createElement('div'));
	roots.push(root);
	await renderPage(root, providers);
	return root;
}

// Lets the reads that follow a sign-in (permissions, organizations, timer status) run and settle.
async function settle() {
	for (let round = 0; round < 10; round += 1) {
		await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
	}
}

const submitted = { preventDefault() {} };

async function signInOn(name) {
	requests.length = 0;
	await act(async () => signIns[name].password.handleSubmit(submitted));
	await settle();
}

async function signInWithTokenOn(name) {
	requests.length = 0;
	await act(async () => signIns[name].token.handleInputChange({ target: { value: 'pasted-token' } }));
	await act(async () => signIns[name].token.handleSubmit(submitted));
	await settle();
}

const requestsTo = (path) => requests.filter((request) => request.path === path);

const hostOf = (apiUrl) => new URL(apiUrl).host;

test('a sign-in on the first of two providers goes to its own API only, with a password or a token', async () => {
	await openPage([
		['a', { apiUrl: SERVER_A }],
		['b', { apiUrl: SERVER_B }]
	]);

	await signInOn('a');
	assert.deepEqual(requestsTo('/auth/login'), [{ host: hostOf(SERVER_A), path: '/auth/login', method: 'POST' }]);

	await signInWithTokenOn('a');
	assert.deepEqual(requestsTo('/user/me'), [{ host: hostOf(SERVER_A), path: '/user/me', method: 'GET' }]);
});

test('a provider alone sends to its own API and still sets the address of the page, as before', async () => {
	await openPage([['c', { apiUrl: 'https://c.example.com/api' }]]);

	await signInOn('c');

	assert.equal(kit.apiConfigManager.getConfig().apiUrl, 'https://c.example.com/api');
	assert.ok(requests.length > 0);
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set(['c.example.com']));
});

test('a provider without an apiUrl follows the address the host set with setConfig, as before', async () => {
	kit.apiConfigManager.setConfig({ apiUrl: 'https://host.example.com/api' });
	await openPage([['d', {}]]);

	await signInOn('d');

	assert.ok(requests.length > 0);
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set(['host.example.com']));
});
