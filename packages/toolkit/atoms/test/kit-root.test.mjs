// KitRoot (the root of <TeamsProvider scopedStyles>): node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles it with toolkit-ui's portal context replaced by a stand-in; React renders it in jsdom.
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

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let React;
let act;
let createRoot;
let KitRoot;
let PortalContainerContext;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-root-'));
	const outfile = path.join(bundleDir, 'kit-root.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'components', 'teams-provider', 'kit-root.tsx')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		external: ['react', 'react/jsx-runtime'],
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
							"import { createContext } from 'react'; export const PortalContainerContext = createContext(null); globalThis.__PortalContainerContext = PortalContainerContext;",
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
	({ KitRoot } = await import(pathToFileURL(outfile).href));
	PortalContainerContext = globalThis.__PortalContainerContext;
});

after(() => {
	const link = path.join(bundleDir, 'node_modules', 'react');
	// A symbolic link on POSIX, a junction on Windows: remove the link itself, never what it points to.
	if (!fs.existsSync(link)) return;
	try {
		fs.unlinkSync(link);
	} catch {
		fs.rmdirSync(link);
	}
});

test('the kit root takes no box, carries the attribute, and gives its components a portal container in the body', async () => {
	let portalSeen = null;
	function Reader() {
		portalSeen = React.useContext(PortalContainerContext);
		return React.createElement('span', { id: 'kit-child' }, 'x');
	}
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	await act(async () => root.render(React.createElement(KitRoot, null, React.createElement(Reader))));

	const wrapper = container.firstElementChild;
	assert.equal(wrapper.hasAttribute('data-ever-teams-kit'), true);
	assert.equal(wrapper.style.display, 'contents');
	assert.equal(wrapper.querySelector('#kit-child')?.textContent, 'x');
	assert.equal(portalSeen?.parentElement, document.body);
	assert.equal(portalSeen.hasAttribute('data-ever-teams-kit'), true);

	await act(async () => root.unmount());
	assert.equal(document.body.contains(portalSeen), false);
});
