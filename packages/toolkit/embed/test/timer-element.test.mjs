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
		export const TeamsProvider = ({ config, colorScheme, lang, scopedStyles, children }) => {
			useEffect(() => () => { globalThis.unmounted = (globalThis.unmounted ?? 0) + 1; }, []);
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

beforeEach(() => {
	document.body.innerHTML = '';
	globalThis.unmounted = 0;
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

test('without api-url the kit keeps its own default API address', async () => {
	const element = await place();

	assert.deepEqual(JSON.parse(providerOf(element).dataset.config), {});
});

test('a removed element unmounts the kit and empties its shadow root', async () => {
	const element = await place({ 'api-url': 'https://api.example.com/api' });
	await act(async () => element.remove());

	assert.equal(globalThis.unmounted, 1);
	assert.equal(element.shadowRoot.childNodes.length, 0);
});

test('a page that loads the script twice keeps working', async () => {
	await import(`${entry}?twice`);
	const element = await place();

	assert.ok(providerOf(element));
});
