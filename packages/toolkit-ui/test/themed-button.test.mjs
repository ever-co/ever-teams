// The theme's colors reach themed buttons inline: node --test test/*.test.mjs (from packages/toolkit-ui).
// esbuild bundles ThemedButton with its imports; the real theme-ui renders it in jsdom.
import { test, before, after } from 'node:test';
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
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// theme-ui's style engine creates its default cache only where HTMLElement exists.
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let React;
let act;
let createRoot;
let ThemeUIProvider;
let ThemedButton;
let useThemeColor;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.themed-button-'));
	const outfile = path.join(bundleDir, 'themed-button.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'components', 'themed-button.tsx')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		external: ['react', 'react/jsx-runtime', 'react-dom', 'theme-ui', '@emotion/react', 'theme-ui/jsx-runtime']
	});
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	({ ThemeUIProvider } = require('theme-ui'));
	({ ThemedButton, useThemeColor } = await import(pathToFileURL(outfile).href));
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

async function renderButton(theme, props = {}) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	await act(async () =>
		root.render(
			React.createElement(ThemeUIProvider, { theme }, React.createElement(ThemedButton, props, 'Sign in'))
		)
	);
	return { root, button: container.querySelector('button') };
}

test('a plain theme color is set inline, so no utility class of the button can replace it', async () => {
	const { root, button } = await renderButton({ colors: { mainColor: 'blue' } });

	assert.equal(button.style.background, 'blue');
	await act(async () => root.unmount());
});

test('the hook gives the raw theme color, not the custom property theme-ui makes of it', async () => {
	const gradient = 'linear-gradient(135deg, #3826A6 0%, #A11DB1 100%)';
	let seen;
	const Probe = () => {
		seen = useThemeColor('mainColor');
		return null;
	};
	const container = document.createElement('div');
	const root = createRoot(container);
	await act(async () =>
		root.render(
			React.createElement(
				ThemeUIProvider,
				{ theme: { colors: { mainColor: gradient } } },
				React.createElement(Probe)
			)
		)
	);

	assert.equal(seen, gradient);
	await act(async () => root.unmount());
});

test('a style passed by the host still wins', async () => {
	const { root, button } = await renderButton({ colors: { mainColor: 'blue' } }, { style: { background: 'green' } });

	assert.equal(button.style.background, 'green');
	await act(async () => root.unmount());
});

// The color useThemeColor gives for the kit theme, inside the given outer providers' themes.
async function themeColor(kitTheme, ...outerThemes) {
	let seen;
	const Probe = () => {
		seen = useThemeColor('mainColor');
		return null;
	};
	let element = React.createElement(ThemeUIProvider, { theme: kitTheme }, React.createElement(Probe));
	for (const theme of outerThemes) {
		element = React.createElement(ThemeUIProvider, { theme }, element);
	}
	const root = createRoot(document.createElement('div'));
	await act(async () => root.render(element));
	await act(async () => root.unmount());
	return seen;
}

test("with custom properties off, the kit's own color wins over a host provider's raw colors", async () => {
	const kitTheme = { config: { useCustomProperties: false }, colors: { mainColor: 'red' } };

	assert.equal(await themeColor(kitTheme, { colors: { mainColor: 'blue' } }), 'red');
});

test('a nested color scale gives its __default value, as an sx color does', async () => {
	assert.equal(await themeColor({ colors: { mainColor: { __default: 'red', light: 'pink' } } }), 'red');
	assert.equal(
		await themeColor({ config: { useCustomProperties: false }, colors: { mainColor: { __default: 'red' } } }),
		'red'
	);
});
