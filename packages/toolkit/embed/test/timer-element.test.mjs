// <ever-teams-timer>: node --test test/*.test.mjs (from packages/toolkit/embed).
// esbuild bundles the element with the kit's components and stylesheet replaced by stand-ins (the provider writes
// what it receives on a div); React renders it in jsdom, which has custom elements and shadow roots.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const esbuild = require('esbuild');

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
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const KIT_RULE = '[data-ever-teams-kit] .kit-rule{color:red}';
const REGISTRATION = '@property --ever-teams-tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}';
const stubs = {
	atoms: `
		import { createElement, useEffect } from 'react';
		// What the last provider rendered was told: the bridge of the element reads the sign-in controls under it.
		let signIn;
		export const useSiteSignIn = () => (signIn === 'ever-teams' ? globalThis.siteControls : null);
		export const endSiteSignIn = async (options) => {
			globalThis.endedSignIns.push(options);
		};
		export const TeamsProvider = ({ config, colorScheme, lang, scopedStyles, onTimerChange, children }) => {
			signIn = config.signIn;
			globalThis.lastConfig = config;
			useEffect(() => () => { globalThis.unmounted = (globalThis.unmounted ?? 0) + 1; }, []);
			// What the kit calls at each change of the timer, as the last render gave it.
			globalThis.onTimerChange = onTimerChange;
			return createElement('div', {
				'data-provider': '',
				'data-config': JSON.stringify(config),
				'data-scheme': colorScheme,
				'data-lang': lang ?? '',
				'data-scoped': String(scopedStyles)
			}, children);
		};
		export const TeamsLoginDialog = () => createElement('button', null, 'Sign In');
		export const TeamsBasicTimer = () => createElement('button', null, '00:00:00');`,
	css: `export default ${JSON.stringify(REGISTRATION + KIT_RULE)};`
};

let React;
let act;
let bundleDir;
let entry;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.timer-element-'));
	const outfile = path.join(bundleDir, 'element.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'index.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['module', 'main'],
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@emotion/react', '@emotion/cache'],
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /^@ever-teams\/atoms$/ }, () => ({ path: 'atoms', namespace: 'stub' }));
					build.onResolve({ filter: /^@ever-teams\/atoms\/styles\.css\?inline$/ }, () => ({
						path: 'css',
						namespace: 'stub'
					}));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
						loader: 'jsx'
					}));
				}
			}
		]
	});
	React = require('react');
	({ act } = React);
	entry = pathToFileURL(outfile).href;
	await import(entry);
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

beforeEach(async () => {
	// The elements of the previous test unmount their kit in a microtask after removal: inside act, before counting.
	await act(async () => {
		document.body.innerHTML = '';
	});
	globalThis.unmounted = 0;
	globalThis.endedSignIns = [];
	globalThis.kitSignOuts = 0;
	globalThis.siteControls = {
		status: 'idle',
		signIn() {},
		async signOut() {
			globalThis.kitSignOuts += 1;
		}
	};
});

async function place(attributes = {}) {
	const element = document.createElement('ever-teams-timer');
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, value);
	}
	await act(async () => document.body.appendChild(element));
	return element;
}

function providerOf(element) {
	return element.shadowRoot.querySelector('[data-provider]');
}

test('the element renders the kit in its own shadow root, with the kit stylesheet and no @property there', async () => {
	const element = await place({ 'api-url': 'https://api.example.com/api' });
	assert.ok(element.shadowRoot, 'an open shadow root');
	const style = element.shadowRoot.querySelector('style').textContent;

	assert.match(style, /:host\{all:initial;display:block;font-family:inherit\}/);
	assert.ok(style.includes(KIT_RULE));
	assert.doesNotMatch(style, /@property/);
	assert.equal(providerOf(element).dataset.scoped, 'true');
	assert.equal(element.shadowRoot.querySelectorAll('button').length, 2, 'the sign-in and the timer');
});

test('the page gets the kit property registrations once, for any number of elements', async () => {
	await place();
	await place();
	const registrations = document.head.querySelectorAll('style[data-ever-teams-properties]');

	assert.equal(registrations.length, 1);
	assert.equal(registrations[0].textContent, REGISTRATION);
});

test('the attributes become the provider settings, and a change of attribute applies at once', async () => {
	const element = await place({ 'api-url': 'https://api.example.com/api', 'color-scheme': 'dark', lang: 'fr' });

	assert.deepEqual(JSON.parse(providerOf(element).dataset.config), { apiUrl: 'https://api.example.com/api' });
	assert.equal(providerOf(element).dataset.scheme, 'dark');
	assert.equal(providerOf(element).dataset.lang, 'fr');

	await act(async () => element.setAttribute('color-scheme', 'blue'));
	assert.equal(providerOf(element).dataset.scheme, 'system', 'an unknown scheme follows the system');
});

test('sign-in="ever-teams" gives the provider the sign-in with Ever Teams, its organization and web app', async () => {
	const element = await place({
		'api-url': 'https://api.example.com/api',
		'sign-in': 'ever-teams',
		organization: 'org-1',
		'app-url': 'https://teams.example.com'
	});

	assert.deepEqual(JSON.parse(providerOf(element).dataset.config), {
		apiUrl: 'https://api.example.com/api',
		signIn: 'ever-teams',
		organizationId: 'org-1',
		appUrl: 'https://teams.example.com'
	});

	await act(async () => element.removeAttribute('app-url'));
	assert.deepEqual(JSON.parse(providerOf(element).dataset.config), {
		apiUrl: 'https://api.example.com/api',
		signIn: 'ever-teams',
		organizationId: 'org-1'
	});

	await act(async () => element.removeAttribute('sign-in'));
	assert.deepEqual(JSON.parse(providerOf(element).dataset.config), { apiUrl: 'https://api.example.com/api' });
});

test('another sign-in value, or organization and app-url without sign-in, keep the kit sign-in as it was', async () => {
	const other = await place({ 'sign-in': 'password', organization: 'org-1' });
	assert.deepEqual(JSON.parse(providerOf(other).dataset.config), {});

	const alone = await place({ organization: 'org-1', 'app-url': 'https://teams.example.com' });
	assert.deepEqual(JSON.parse(providerOf(alone).dataset.config), {});
});

test('without api-url the kit keeps its own default API address', async () => {
	const element = await place();

	assert.deepEqual(JSON.parse(providerOf(element).dataset.config), {});
});

test('an element that never had api-url leaves the API address alone when another attribute changes', async () => {
	const element = await place();
	await act(async () => element.setAttribute('color-scheme', 'dark'));

	assert.deepEqual(JSON.parse(providerOf(element).dataset.config), {});
});

test('a removed api-url gives the provider the client default address', async () => {
	const element = await place({ 'api-url': 'https://api.example.com/api' });
	await act(async () => element.removeAttribute('api-url'));

	assert.deepEqual(JSON.parse(providerOf(element).dataset.config), { apiUrl: 'https://api.ever.team/api' });
});

test('a removed element unmounts the kit and empties its shadow root', async () => {
	const element = await place({ 'api-url': 'https://api.example.com/api' });
	await act(async () => element.remove());

	assert.equal(globalThis.unmounted, 1);
	assert.equal(element.shadowRoot.childNodes.length, 0);
});

test('an element moved in the page keeps its kit as it was, mounted once', async () => {
	const element = await place();
	const provider = providerOf(element);
	const section = document.createElement('section');
	document.body.appendChild(section);
	await act(async () => section.appendChild(element));

	assert.equal(globalThis.unmounted, 0);
	assert.equal(providerOf(element), provider, 'the same rendering, not a new one');
	assert.equal(element.shadowRoot.querySelectorAll('[data-provider]').length, 1);
});

test('an element removed and put back later gets a fresh kit', async () => {
	const element = await place();
	await act(async () => element.remove());
	await act(async () => document.body.appendChild(element));

	assert.equal(globalThis.unmounted, 1);
	assert.ok(providerOf(element));
});

test('a page that loads the script twice keeps working', async () => {
	await import(`${entry}?twice`);
	const element = await place();

	assert.ok(providerOf(element));
});

const CHANGE = {
	running: true,
	startedAt: '2026-11-18T09:00:00.000Z',
	projectId: 'project-1',
	taskId: null,
	initial: false
};

test('a change of the timer reaches the page as ever-teams-timer-change, with the change as its detail', async () => {
	const element = await place({ 'api-url': 'https://api.example.com/api' });
	const heard = [];
	document.addEventListener('ever-teams-timer-change', (event) => heard.push(event));

	await act(async () => globalThis.onTimerChange(CHANGE));

	assert.equal(heard.length, 1);
	assert.equal(heard[0].target, element);
	assert.deepEqual(heard[0].detail, CHANGE);
	assert.equal(heard[0].bubbles, true);
	assert.equal(heard[0].composed, true);
});

test("an element inside another component's shadow root still tells the page", async () => {
	const host = document.createElement('div');
	const shadow = host.attachShadow({ mode: 'open' });
	await act(async () => document.body.appendChild(host));
	const element = document.createElement('ever-teams-timer');
	await act(async () => shadow.appendChild(element));
	const heard = [];
	document.addEventListener('ever-teams-timer-change', (event) => heard.push(event.detail));

	await act(async () => globalThis.onTimerChange({ ...CHANGE, running: false, startedAt: null, projectId: null }));

	assert.equal(heard.length, 1);
	assert.equal(heard[0].running, false);
});

test('the element gives the kit the same callback at every render, so a change of attribute starts nothing over', async () => {
	const element = await place();
	const first = globalThis.onTimerChange;
	await act(async () => element.setAttribute('color-scheme', 'dark'));

	assert.equal(typeof first, 'function');
	assert.equal(globalThis.onTimerChange, first);
});

const SITE_SIGN_IN = { 'api-url': 'https://api.example.com/api', 'sign-in': 'ever-teams', organization: 'org-1' };

test('signOut() ends the sign-in with Ever Teams through the kit, as its user menu does, while the element shows it', async () => {
	const element = await place(SITE_SIGN_IN);

	await act(async () => element.signOut());

	assert.equal(globalThis.kitSignOuts, 1);
	assert.deepEqual(globalThis.endedSignIns, []);
});

test('signOut() on an element already removed ends the sign-in saved for its api-url and organization', async () => {
	const element = await place(SITE_SIGN_IN);
	await act(async () => element.remove());

	await element.signOut();

	assert.equal(globalThis.kitSignOuts, 0);
	assert.deepEqual(globalThis.endedSignIns, [{ apiUrl: 'https://api.example.com/api', organizationId: 'org-1' }]);
});

test('signOut() right after a change of organization ends the sign-in of the new one, not the previous one through the kit', async () => {
	const element = await place(SITE_SIGN_IN);

	element.setAttribute('organization', 'org-2');
	await element.signOut();

	assert.equal(globalThis.kitSignOuts, 0);
	assert.deepEqual(globalThis.endedSignIns, [{ apiUrl: 'https://api.example.com/api', organizationId: 'org-2' }]);
	await act(async () => {});
});

test('signOut() right after sign-in="ever-teams" is removed ends nothing', async () => {
	const element = await place(SITE_SIGN_IN);

	element.removeAttribute('sign-in');
	await element.signOut();

	assert.equal(globalThis.kitSignOuts, 0);
	assert.deepEqual(globalThis.endedSignIns, []);
	await act(async () => {});
});

test('signOut() without sign-in="ever-teams" ends nothing, in the page or removed', async () => {
	const element = await place({ 'api-url': 'https://api.example.com/api' });

	await act(async () => element.signOut());
	await act(async () => element.remove());
	await element.signOut();

	assert.equal(globalThis.kitSignOuts, 0);
	assert.deepEqual(globalThis.endedSignIns, []);
});
// What the host's token route sees and answers, as the API README's route handlers do.
function standInTokenRoute(answer) {
	const calls = [];
	globalThis.fetch = async (url, init) => {
		calls.push({ url: String(url), method: init?.method, credentials: init?.credentials });
		return answer();
	};
	return calls;
}

const TOKEN = { token: 'embed-token', expiresAt: '2026-11-20T10:15:00.000Z' };
const answered = (status, body) => () =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test("token-url gives the kit a getToken that asks the host's route with the page's cookies (#5596)", async () => {
	const calls = standInTokenRoute(answered(200, TOKEN));
	await place({ 'api-url': 'https://api.example.com/api', 'token-url': '/api/ever-teams-token' });

	const token = await globalThis.lastConfig.getToken();

	assert.deepEqual(token, TOKEN);
	assert.deepEqual(calls, [{ url: '/api/ever-teams-token', method: 'POST', credentials: 'same-origin' }]);
});

test('a token route that refuses shows the person as signed out: getToken fails', async () => {
	standInTokenRoute(answered(401, { message: 'Sign in first' }));
	await place({ 'api-url': 'https://api.example.com/api', 'token-url': '/api/ever-teams-token' });

	await assert.rejects(globalThis.lastConfig.getToken(), /token-url answered 401/);
});

test('token-url keeps its getToken through other changes, gives a new one for another route, and none without it', async () => {
	const calls = standInTokenRoute(answered(200, TOKEN));
	const element = await place({ 'api-url': 'https://api.example.com/api', 'token-url': '/api/ever-teams-token' });
	const first = globalThis.lastConfig.getToken;

	await act(async () => element.setAttribute('color-scheme', 'dark'));
	assert.equal(globalThis.lastConfig.getToken, first);
	assert.equal(globalThis.unmounted, 0, 'the same session');

	await act(async () => element.setAttribute('token-url', '/other/token'));
	assert.notEqual(globalThis.lastConfig.getToken, first);
	assert.equal(globalThis.unmounted, 1, 'another route starts a new session, with no account of the previous one');
	await globalThis.lastConfig.getToken();
	assert.equal(calls.at(-1).url, '/other/token', 'the new session asks the new route');

	await act(async () => element.removeAttribute('token-url'));
	assert.equal(globalThis.lastConfig.getToken, undefined);
});

test('signOut() with token-url starts a new session that asks the route again, and ends no sign-in with Ever Teams', async () => {
	const calls = standInTokenRoute(answered(200, TOKEN));
	const element = await place({ 'api-url': 'https://api.example.com/api', 'token-url': '/api/ever-teams-token' });

	await act(async () => element.signOut());

	assert.equal(globalThis.unmounted, 1, 'the token the kit held goes with its session');
	await globalThis.lastConfig.getToken();
	assert.equal(calls.at(-1).url, '/api/ever-teams-token', 'the new session asks the same route');
	assert.equal(globalThis.kitSignOuts, 0);
	assert.deepEqual(globalThis.endedSignIns, []);

	await act(async () => element.setAttribute('color-scheme', 'dark'));
	assert.equal(globalThis.unmounted, 1, 'a later change of attribute keeps that session');
});

test('the package exports the event name', async () => {
	const { TIMER_CHANGE_EVENT } = await import(entry);

	assert.equal(TIMER_CHANGE_EVENT, 'ever-teams-timer-change');
});
