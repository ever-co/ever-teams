// theme-ui writes no global styles on the host page: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the kit's theme config and default theme; the real theme-ui renders a styled box in jsdom.
import { test, before, after } from 'node:test';
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
// theme-ui's style engine creates its default cache only where HTMLElement exists.
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let React;
let act;
let createRoot;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-ui-global-styles-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const lib = path.join(here, '..', 'src', 'lib').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { withoutGlobalStyles } from '${lib}/themes/kit-theme-config.ts';
		export { defaultTheme } from '${lib}/themes/themes.ts';`
	);
	const outfile = path.join(bundleDir, 'kit.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		outfile,
		external: ['theme-ui']
	});
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

function pageStyles() {
	return [...document.querySelectorAll('style')]
		.map((style) => {
			const rules = [...(style.sheet?.cssRules ?? [])].map((rule) => rule.cssText);
			return [style.textContent, ...rules].join('\n');
		})
		.join('\n');
}

test('theme-ui writes nothing on html, body or every element, and the widgets still get the theme colors', async () => {
	const { ThemeUIProvider, Box } = require('theme-ui');
	const theme = kit.withoutGlobalStyles(kit.defaultTheme);
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	await act(async () =>
		root.render(
			React.createElement(
				ThemeUIProvider,
				{ theme },
				React.createElement(Box, { sx: { background: 'mainColor' } })
			)
		)
	);
	const styles = pageStyles();

	assert.doesNotMatch(styles, /(^|[\s,}])(html|body|\*)\s*[{,]/);
	assert.doesNotMatch(styles, /var\(--theme-ui/);
	assert.match(styles, /linear-gradient\(135deg, ?#3826A6/i);
	assert.equal(window.localStorage.getItem('theme-ui-color-mode'), null);
	await act(async () => root.unmount());
});

test('the host theme config is kept, apart from the global styles', () => {
	const theme = kit.withoutGlobalStyles({ colors: { text: '#111' }, config: { initialColorModeName: 'brand' } });

	assert.equal(theme.colors.text, '#111');
	assert.equal(theme.config.initialColorModeName, 'brand');
	assert.equal(theme.config.useRootStyles, false);
});
