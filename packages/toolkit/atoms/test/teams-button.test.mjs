// The timer button keeps the theme's color under a host style: node --test test/*.test.mjs (from
// packages/toolkit/atoms). esbuild bundles TeamsButton with toolkit-ui, the kit context and i18n replaced by stand-ins
// (the theme's mainColor is 'blue'); React renders it in jsdom.
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

const STAND_INS = {
	'@ever-teams/toolkit-ui': `export const cn = (...classes) => classes.filter(Boolean).join(' ');
		export const useThemeColor = () => 'blue';
		export const StartIcon = () => null;
		export const PauseIcon = () => null;
		export const Tooltip = ({ children }) => children;`,
	'@lib/context/teams-context': `export const useTeamsContext = () => ({ authenticatedUser: null });`,
	'react-i18next': `export const useTranslation = () => ({ t: (key) => key });`
};

let React;
let act;
let createRoot;
let TeamsButton;
let bundleDir;

before(async () => {
	// Inside the package, so that the bundle's react and theme-ui resolve to the package's own.
	bundleDir = fs.mkdtempSync(path.join(here, '.teams-button-'));
	const outfile = path.join(bundleDir, 'teams-button.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'components', 'teams-ui-components', 'button', 'button.tsx')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime', 'react-dom', 'theme-ui', 'theme-ui/jsx-runtime', '@emotion/react'],
		plugins: [
			{
				name: 'stand-ins',
				setup(build) {
					const names = Object.keys(STAND_INS).map((name) => name.replace(/[/@-]/g, '\\$&'));
					build.onResolve({ filter: new RegExp(`^(${names.join('|')})$`) }, (args) => ({
						path: args.path,
						namespace: 'stand-in'
					}));
					build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({
						contents: STAND_INS[args.path],
						loader: 'js'
					}));
				}
			}
		]
	});
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	({ TeamsButton } = await import(pathToFileURL(outfile).href));
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

async function renderButton(props) {
	const container = document.createElement('div');
	const root = createRoot(container);
	const timer = { isRunning: false, startTimer: async () => {}, stopTimer: async () => {} };
	await act(async () => root.render(React.createElement(TeamsButton, { ...timer, ...props })));
	const button = container.querySelector('button');
	return { button, unmount: () => act(async () => root.unmount()) };
}

test("a host style without a background keeps the theme's color", async () => {
	const { button, unmount } = await renderButton({ style: { padding: '4px' } });

	assert.equal(button.style.background, 'blue');
	assert.equal(button.style.padding, '4px');
	await unmount();
});

test('a host style with a background replaces the theme color', async () => {
	const { button, unmount } = await renderButton({ style: { background: 'green' } });

	assert.equal(button.style.background, 'green');
	await unmount();
});
