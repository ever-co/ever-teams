// The theme's main color reaches the progress bar and the themed tabs list inline: node --test test/*.test.mjs (from
// packages/toolkit-ui). Under the kit root of <TeamsProvider scopedStyles> an sx color loses to the components' own
// background classes, which are scoped and so more specific. esbuild bundles both components with Radix; the real
// theme-ui renders them in jsdom.
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
let components;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.theme-colors-'));
	const outfile = path.join(bundleDir, 'theme-colors.mjs');
	const componentsDir = path.join(here, '..', 'src', 'lib', 'components');
	await esbuild.build({
		stdin: {
			contents: "export { Progress } from './progress';\nexport { Tabs, TabsListThemed } from './tabs';\n",
			resolveDir: componentsDir,
			loader: 'ts'
		},
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime', 'react-dom', 'theme-ui', '@emotion/react', 'theme-ui/jsx-runtime']
	});
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	({ ThemeUIProvider } = require('theme-ui'));
	components = await import(pathToFileURL(outfile).href);
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

async function render(element) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	await act(async () =>
		root.render(React.createElement(ThemeUIProvider, { theme: { colors: { mainColor: 'blue' } } }, element))
	);
	return { root, container };
}

test('the progress bar draws its indicator in the theme color, set inline', async () => {
	const { Progress } = components;
	const { root, container } = await render(React.createElement(Progress, { value: 40 }));
	const indicator = container.querySelector('[data-state] > [data-state]');

	assert.equal(indicator.style.background, 'blue');
	assert.equal(indicator.style.transform, 'translateX(-60%)');
	await act(async () => root.unmount());
});

test('the themed tabs list takes the theme color inline, and a style passed by the host still wins', async () => {
	const { Tabs, TabsListThemed } = components;
	const themed = await render(
		React.createElement(Tabs, { defaultValue: 'a' }, React.createElement(TabsListThemed, null, 'tabs'))
	);
	assert.equal(themed.container.querySelector('[role="tablist"]').style.background, 'blue');
	await act(async () => themed.root.unmount());

	const styled = await render(
		React.createElement(
			Tabs,
			{ defaultValue: 'a' },
			React.createElement(TabsListThemed, { style: { background: 'green' } }, 'tabs')
		)
	);
	assert.equal(styled.container.querySelector('[role="tablist"]').style.background, 'green');
	await act(async () => styled.root.unmount());
});
