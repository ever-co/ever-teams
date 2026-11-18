// The language of a TeamsProvider follows its lang prop: node --test test/*.test.mjs (from packages/toolkit/atoms).
// The hook is bundled next to this file with the kit's language switch aliased to a stand-in that records each
// language applied and saves it as the real one does.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const { window } = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = require('react');
const { createRoot } = require('react-dom/client');
const workDir = fs.mkdtempSync(path.join(here, '.provider-language-'));
let useProviderLanguage;

before(async () => {
	const switchStandIn = path.join(workDir, 'language-switch.mjs');
	fs.writeFileSync(
		switchStandIn,
		`export function changeTeamsLanguage(language) {
			globalThis.applied.push(language);
			localStorage.setItem('preferred-language', language);
		}`
	);
	const outfile = path.join(workDir, 'hook.mjs');
	await require('esbuild').build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'hooks', 'useProviderLanguage.ts')],
		bundle: true,
		format: 'esm',
		outfile,
		logLevel: 'error',
		external: ['react'],
		alias: { '@components/i18n/language-switch': switchStandIn }
	});
	({ useProviderLanguage } = await import(pathToFileURL(outfile).href));
});

after(() => fs.rmSync(workDir, { recursive: true, force: true }));

beforeEach(() => {
	localStorage.clear();
	globalThis.applied = [];
});

// Renders a provider language with `lang`, and answers a function that renders it again with another one.
async function withLanguage(lang) {
	const Language = (props) => {
		useProviderLanguage(props.lang);
		return null;
	};
	const root = createRoot(document.createElement('div'));
	const show = (next) => React.act(async () => root.render(React.createElement(Language, { lang: next })));
	await show(lang);
	return { show, unmount: () => React.act(async () => root.unmount()) };
}

test('a lang the host changes after mount applies at once', async () => {
	const language = await withLanguage('en');
	await language.show('fr');

	assert.equal(globalThis.applied.at(-1), 'fr');
	assert.equal(localStorage.getItem('preferred-language'), 'fr');
	await language.unmount();
});

test('at mount, the language saved earlier on the site wins, as before', async () => {
	localStorage.setItem('preferred-language', 'fr');
	const language = await withLanguage('en');

	assert.equal(globalThis.applied.at(-1), 'fr');
	await language.unmount();
});

test('without a saved language, the provider uses lang', async () => {
	const language = await withLanguage('fr');

	assert.deepEqual(globalThis.applied, ['fr']);
	await language.unmount();
});
