// The font toggle names the font the widgets draw in: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the toggle with toolkit-ui's Select replaced by an element showing the value and placeholder it is
// given, and the translations read from the kit's locale files; React renders it in jsdom, as in a browser.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const lib = path.join(here, '..', 'src', 'lib');
const locale = (lang) => JSON.parse(fs.readFileSync(path.join(lib, 'i18n', 'locales', `${lang}.json`), 'utf8'));

const stubs = {
	'react-i18next': `export const useTranslation = () => ({
			t: (key) => key.split('.').reduce((group, part) => group?.[part], globalThis.kitLocale) ?? key
		});`,
	'@ever-teams/toolkit-ui': `import { createContext, createElement } from 'react';
		export const PortalContainerContext = createContext(null);
		export const cn = (...names) => names.filter(Boolean).join(' ');
		export const Select = ({ value, placeholder }) =>
			createElement('output', { 'data-value': value }, value || placeholder);`
};

let React;
let act;
let createRoot;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.font-toggle-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const source = lib.replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { TeamsFontToggle } from '${source}/components/teams-ui-components/teams-font-toggle.tsx';
		export { KitOptionsProvider } from '${source}/components/teams-provider/kit-root.tsx';
		export { FONT_OPTIONS } from '${source}/font/font.ts';
		export * from '${source}/stores/kit-preferences.ts';`
	);
	const outfile = path.join(bundleDir, 'toggle.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime'],
		alias: { '@components': path.join(lib, 'components'), '@lib': lib, '@hooks': path.join(lib, 'hooks') },
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /^(@ever-teams\/toolkit-ui|react-i18next)$/ }, (args) => ({
						path: args.path,
						namespace: 'stub'
					}));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
						loader: 'js',
						resolveDir: here
					}));
				}
			}
		]
	});
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

beforeEach(() => {
	globalThis.kitLocale = locale('en');
	// The reset reads the stored font again: a font picked by an earlier case is forgotten first
	window.localStorage.clear();
	kit.resetKitPreferences();
});

// What the toggle's Select is given, as the stand-in shows it
async function toggle({ scoped }) {
	const container = document.createElement('div');
	const root = createRoot(container);
	const element = React.createElement(kit.TeamsFontToggle);
	await act(async () => root.render(React.createElement(kit.KitOptionsProvider, { value: { scoped } }, element)));
	const markup = container.innerHTML;
	await act(async () => root.unmount());
	return markup.match(/<output[^>]*>[^<]*<\/output>/)?.[0];
}

test('without a picked font the toggle names the system font the kit root draws in, not a font it does not use', async () => {
	assert.equal(await toggle({ scoped: true }), '<output data-value="">System font</output>');
});

test('without a kit root the toggle names the page font, which the widgets take there', async () => {
	assert.equal(await toggle({ scoped: false }), '<output data-value="">Page font</output>');
});

test('a picked font is the one the toggle shows', async () => {
	const picked = kit.FONT_OPTIONS[1].value;
	kit.setKitPreferences({ font: picked });

	assert.match(await toggle({ scoped: true }), new RegExp(`data-value="${picked.replace(/"/g, '&quot;')}"`));
});

test('the toggle speaks the kit language, and both locales have its words', async () => {
	globalThis.kitLocale = locale('fr');

	assert.equal(await toggle({ scoped: true }), '<output data-value="">Police du système</output>');
	assert.deepEqual(Object.keys(locale('fr').FONT_PICKER), Object.keys(locale('en').FONT_PICKER));
});
