// The kit's theme toggles switch the kit, never a host page's own theme: node --test test/*.test.mjs (from
// packages/toolkit/atoms).
// esbuild bundles the toggles, the kit options and the preference store. next-themes is replaced by a stand-in: its
// provider, as a host page would render one, draws the theme as the class of <html>; without a provider, setTheme does
// nothing, as next-themes' own does. React renders them in jsdom.
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

const STUBS = {
	'@ever-teams/toolkit-ui':
		"import { createContext } from 'react'; export const PortalContainerContext = createContext(null); export const cn = (...names) => names.filter(Boolean).join(' ');",
	'next-themes': `import { createContext, createElement, useContext } from 'react';
		const ThemeContext = createContext({ setTheme() {} });
		const setTheme = (theme) => { document.documentElement.className = theme; };
		export const ThemeProvider = ({ children }) => createElement(ThemeContext.Provider, { value: { setTheme } }, children);
		export const useTheme = () => useContext(ThemeContext);`
};

let React;
let act;
let createRoot;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-toggle-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const lib = path.join(here, '..', 'src', 'lib').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { ThemeToggle, ToggleThemeContainer } from '${lib}/components/teams-theme/theme-toggle.tsx';
		export { KitOptionsProvider } from '${lib}/components/teams-provider/kit-root.tsx';
		export { ThemeProvider } from 'next-themes';
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
					build.onResolve({ filter: /^(@ever-teams\/toolkit-ui|next-themes)$/ }, (args) => ({
						path: args.path,
						namespace: 'stub'
					}));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: STUBS[args.path],
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
	document.body.innerHTML = '';
	document.documentElement.className = 'light';
	kit.resetKitPreferences();
});

// A toggle on a host page that has its own next-themes provider, inside <TeamsProvider scopedStyles> (scoped) or not.
async function renderOnHostPage(scoped, toggle) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	const inKit = React.createElement(kit.KitOptionsProvider, { value: { scoped } }, React.createElement(toggle));
	await act(async () => root.render(React.createElement(kit.ThemeProvider, null, inKit)));
	return { root, container };
}

async function clickDark(container) {
	const [, dark] = container.querySelectorAll('button');
	await act(async () => dark.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
}

for (const [name, toggle] of [
	['ThemeToggle', () => kit.ThemeToggle],
	['ToggleThemeContainer', () => kit.ToggleThemeContainer]
]) {
	test(`with scopedStyles, ${name} switches the kit and leaves the host page's theme alone`, async () => {
		const { root, container } = await renderOnHostPage(true, toggle());

		await clickDark(container);

		assert.equal(kit.getKitPreferences().colorScheme, 'dark');
		assert.equal(document.documentElement.className, 'light');
		await act(async () => root.unmount());
	});

	test(`without scopedStyles, ${name} still switches the page through next-themes`, async () => {
		const { root, container } = await renderOnHostPage(false, toggle());

		await clickDark(container);

		assert.equal(kit.getKitPreferences().colorScheme, 'dark');
		assert.equal(document.documentElement.className, 'dark');
		await act(async () => root.unmount());
	});
}
