// The language of a TeamsProvider follows its lang prop: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the hook with the kit's i18next instance replaced by a stand-in that records each language applied;
// React renders it in jsdom.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const esbuild = require('esbuild');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let React;
let act;
let createRoot;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-language-'));
	const outfile = path.join(bundleDir, 'hook.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'hooks', 'useProviderLanguage.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		outfile,
		logLevel: 'error',
		external: ['react'],
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /^@lib\/i18n\/init$/ }, () => ({ path: 'i18n', namespace: 'stub' }));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
						contents: `export default { changeLanguage: (language) => globalThis.applied.push(language) };`,
						loader: 'js'
					}));
				}
			}
		]
	});
	fs.mkdirSync(path.join(bundleDir, 'node_modules'));
	fs.symlinkSync(
		path.dirname(require.resolve('react/package.json')),
		path.join(bundleDir, 'node_modules', 'react'),
		'junction'
	);
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
	if (!bundleDir) return;
	const link = path.join(bundleDir, 'node_modules', 'react');
	// A junction on Windows: remove the link itself, never what it points to.
	if (fs.existsSync(link)) fs.unlinkSync(link);
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

beforeEach(() => {
	localStorage.clear();
	globalThis.applied = [];
});

function Language({ lang }) {
	kit.useProviderLanguage(lang);
	return null;
}

async function mount(lang) {
	const root = createRoot(document.createElement('div'));
	await act(async () => root.render(React.createElement(Language, { lang })));
	return root;
}

test('a lang the host changes after mount applies at once', async () => {
	const root = await mount('en');
	await act(async () => root.render(React.createElement(Language, { lang: 'fr' })));

	assert.equal(globalThis.applied.at(-1), 'fr');
	await act(async () => root.unmount());
});

test('the lang of one page is not saved: another page of the site gets its own lang', async () => {
	const english = await mount('en');
	await act(async () => english.render(React.createElement(Language, { lang: 'fr' })));
	await act(async () => english.unmount());
	assert.equal(localStorage.getItem('preferred-language'), null, 'only the language switch saves a language');

	const next = await mount('en');
	assert.equal(globalThis.applied.at(-1), 'en');
	await act(async () => next.unmount());
});

test('at mount, the language picked earlier in the language switch wins, as before', async () => {
	localStorage.setItem('preferred-language', 'fr');
	const root = await mount('en');

	assert.equal(globalThis.applied.at(-1), 'fr');
	await act(async () => root.unmount());
});

test('without a saved language, the provider uses lang', async () => {
	const root = await mount('fr');

	assert.deepEqual(globalThis.applied, ['fr']);
	await act(async () => root.unmount());
});
