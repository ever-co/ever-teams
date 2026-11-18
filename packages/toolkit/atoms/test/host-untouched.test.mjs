// The kit leaves the host page alone (font, color scheme, Google Fonts): node --test test/*.test.mjs (from
// packages/toolkit/atoms).
// esbuild bundles the kit root, the font hook and the preference store with toolkit-ui's portal context replaced by a
// stand-in; React renders them in jsdom.
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
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let systemDark = false;
dom.window.matchMedia = () => ({ matches: systemDark, addEventListener() {}, removeEventListener() {} });

let React;
let act;
let createRoot;
let kit;
let bundleDir;
const warnings = [];
const POPPINS = '"Poppins", sans-serif';
const ROBOTO = '"Roboto", sans-serif';
const OLD_DEFAULT_FONT = '"Geist", serif';

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-untouched-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const lib = path.join(here, '..', 'src', 'lib').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { KitRoot } from '${lib}/components/teams-provider/kit-root.tsx';
		export { default as useFontSelector } from '${lib}/hooks/useFontSelector.ts';
		export { KitOptionsProvider } from '${lib}/components/teams-provider/kit-root.tsx';
		export * from '${lib}/stores/kit-preferences.ts';`
	);
	const outfile = path.join(bundleDir, 'kit.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		external: ['react', 'react/jsx-runtime'],
		alias: {
			'@lib': path.join(here, '..', 'src', 'lib'),
			'@components': path.join(here, '..', 'src', 'lib', 'components')
		},
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /^@ever-teams\/toolkit-ui$/ }, () => ({
						path: 'toolkit-ui',
						namespace: 'stub'
					}));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
						contents:
							"import { createContext } from 'react'; export const PortalContainerContext = createContext(null);",
						loader: 'js',
						resolveDir: here
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
	console.warn = (message) => warnings.push(String(message));
});

after(() => {
	if (!bundleDir) return;
	const link = path.join(bundleDir, 'node_modules', 'react');
	// A symbolic link on POSIX, a junction on Windows: remove the link itself, never what it points to.
	if (fs.existsSync(link)) {
		try {
			fs.unlinkSync(link);
		} catch {
			fs.rmdirSync(link);
		}
	}
	// Only once the link to React is gone: the folder then holds nothing but the bundle.
	if (!fs.existsSync(link)) {
		fs.rmSync(bundleDir, { recursive: true, force: true });
	}
});

beforeEach(() => {
	window.localStorage.clear();
	document.head.innerHTML = '';
	document.body.innerHTML = '';
	document.body.removeAttribute('style');
	systemDark = false;
	warnings.length = 0;
	kit.resetKitPreferences();
});

async function render(element) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	await act(async () => root.render(element));
	return { root, container };
}

// A component of a page with <TeamsProvider scopedStyles> (scoped) or without it.
function inKit(scoped, child) {
	return React.createElement(kit.KitOptionsProvider, { value: { scoped } }, child);
}

function FontPicker({ pick }) {
	const { setSelectedFont } = kit.useFontSelector();
	React.useEffect(() => {
		if (pick) setSelectedFont(pick);
	}, [pick]);
	return null;
}

test('the font hook never changes the body, and asks Google nothing by default', async () => {
	const { root } = await render(inKit(true, React.createElement(FontPicker, { pick: POPPINS })));

	assert.equal(document.body.style.fontFamily, '');
	assert.equal(document.head.querySelectorAll('link[href*="fonts.googleapis.com"]').length, 0);
	await act(async () => root.unmount());
});

test('with loadGoogleFonts, a picked Google font is requested once', async () => {
	kit.setKitPreferences({ loadGoogleFonts: true });
	const { root } = await render(inKit(true, React.createElement(FontPicker, { pick: POPPINS })));

	const links = [...document.head.querySelectorAll('link[href*="fonts.googleapis.com"]')];
	assert.equal(links.length, 1);
	assert.match(links[0].href, /family=Poppins/);
	await act(async () => root.unmount());
});

test('a picked font applies to the kit root and its portal container, the host font stays elsewhere', async () => {
	const { root, container } = await render(
		inKit(true, React.createElement(kit.KitRoot, null, React.createElement(FontPicker, { pick: POPPINS })))
	);
	const wrapper = container.firstElementChild;
	const portal = document.querySelector('[data-ever-teams-portal]');

	assert.match(wrapper.style.fontFamily, /Poppins/);
	assert.match(portal.style.fontFamily, /Poppins/);
	assert.equal(document.body.style.fontFamily, '');
	await act(async () => root.unmount());
});

test('without a picked font the kit root keeps the host font', async () => {
	const { root, container } = await render(React.createElement(kit.KitRoot));

	assert.equal(container.firstElementChild.style.fontFamily, '');
	await act(async () => root.unmount());
});

test('the color scheme is drawn on the kit root and its portal container, never on <html>', async () => {
	systemDark = true;
	const { root, container } = await render(React.createElement(kit.KitRoot));
	const wrapper = container.firstElementChild;
	const portal = document.querySelector('[data-ever-teams-portal]');

	assert.equal(wrapper.getAttribute('data-ever-teams-color-scheme'), 'dark');
	assert.equal(wrapper.classList.contains('dark'), true);
	assert.equal(portal.classList.contains('dark'), true);
	assert.equal(document.documentElement.className, '');
	assert.equal(document.documentElement.style.colorScheme, '');

	await act(async () => kit.setKitPreferences({ colorScheme: 'light' }));
	assert.equal(wrapper.getAttribute('data-ever-teams-color-scheme'), 'light');
	assert.equal(wrapper.classList.contains('dark'), false);
	assert.equal(portal.classList.contains('dark'), false);
	await act(async () => root.unmount());
});

test('a font picked with versions up to 0.2.14 is kept, under the prefixed key', () => {
	window.localStorage.setItem('selected-font', ROBOTO);
	kit.resetKitPreferences();

	assert.equal(kit.getKitPreferences().font, ROBOTO);
	assert.equal(window.localStorage.getItem('ever-teams:selected-font'), ROBOTO);
});

test('the default font those versions stored on every load is not taken for a choice', () => {
	window.localStorage.setItem('selected-font', OLD_DEFAULT_FONT);
	kit.resetKitPreferences();

	assert.equal(kit.getKitPreferences().font, null);
	assert.equal(window.localStorage.getItem('ever-teams:selected-font'), null);
});

test('without scopedStyles a picked font still goes on the body, with one warning', async () => {
	const { root } = await render(
		inKit(false, [
			React.createElement(FontPicker, { key: 'a', pick: POPPINS }),
			React.createElement(FontPicker, { key: 'b', pick: POPPINS })
		])
	);

	assert.match(document.body.style.fontFamily, /Poppins/);
	assert.equal(warnings.filter((warning) => warning.includes('document.body')).length, 1);
	assert.equal(document.head.querySelectorAll('link[href*="fonts.googleapis.com"]').length, 0);
	await act(async () => root.unmount());
});

test('without scopedStyles and without a picked font, the body keeps the host font', async () => {
	const { root } = await render(inKit(false, React.createElement(FontPicker)));

	assert.equal(document.body.style.fontFamily, '');
	assert.equal(warnings.length, 0);
	await act(async () => root.unmount());
});

test('the server snapshot is the same object from call to call, as React requires for hydration', () => {
	assert.equal(kit.getServerKitPreferences(), kit.getServerKitPreferences());
	assert.equal(kit.getServerKitPreferences().font, null);
});

test('a storage that refuses writes keeps the font in memory, and the widgets still hear of it', () => {
	window.localStorage.setItem('selected-font', ROBOTO);
	const setItem = Object.getOwnPropertyDescriptor(window.Storage.prototype, 'setItem');
	Object.defineProperty(window.Storage.prototype, 'setItem', {
		...setItem,
		value() {
			throw new window.DOMException('quota', 'QuotaExceededError');
		}
	});
	try {
		kit.resetKitPreferences();
		assert.equal(kit.getKitPreferences().font, ROBOTO);

		let heard = 0;
		const unsubscribe = kit.subscribeKitPreferences(() => heard++);
		kit.setKitPreferences({ font: POPPINS });
		unsubscribe();

		assert.equal(kit.getKitPreferences().font, POPPINS);
		assert.equal(heard, 1);
	} finally {
		Object.defineProperty(window.Storage.prototype, 'setItem', setItem);
	}
});

test('two font updates in a row build on each other', async () => {
	let setSelectedFont;
	function Setter() {
		({ setSelectedFont } = kit.useFontSelector());
		return null;
	}
	kit.setKitPreferences({ font: 'A' });
	const { root } = await render(inKit(true, React.createElement(Setter)));

	await act(async () => {
		setSelectedFont((font) => `${font}B`);
		setSelectedFont((font) => `${font}C`);
	});

	assert.equal(kit.getKitPreferences().font, 'ABC');
	await act(async () => root.unmount());
});

test('system follows the system scheme, light and dark are kept as chosen', () => {
	assert.equal(kit.resolveColorScheme('system', true), 'dark');
	assert.equal(kit.resolveColorScheme('system', false), 'light');
	assert.equal(kit.resolveColorScheme('light', true), 'light');
	assert.equal(kit.resolveColorScheme('dark', false), 'dark');
});
