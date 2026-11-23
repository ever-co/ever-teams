// A dialog opened inside a shadow root takes the focus itself, and the kit's Dialog says when it has no description:
// node --test test/*.test.mjs (from packages/toolkit-ui).
// esbuild bundles the dialog with Radix; React renders it in jsdom, in a shadow root as <ever-teams-timer> does.
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

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
	url: 'http://localhost/',
	pretendToBeVisual: true
});
// Radix's dialog reads many browser globals (MutationObserver, NodeFilter, HTMLInputElement...): every one jsdom has
// and Node does not.
for (const name of Object.getOwnPropertyNames(dom.window)) {
	if (!(name in globalThis)) {
		globalThis[name] = dom.window[name];
	}
}
// Node has its own events, which jsdom does not dispatch.
for (const name of ['Event', 'CustomEvent', 'EventTarget']) {
	globalThis[name] = dom.window[name];
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let React;
let act;
let createRoot;
let ui;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.dialog-shadow-root-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const components = path.join(here, '..', 'src', 'lib', 'components').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { ShadCnDialog, DialogContent, DialogTitle } from '${components}/dialog/dialog.tsx';
		export { PortalContainerContext } from '${components}/portal-container.tsx';
		export { Dialog } from '${components}/dialog/teams-dailog.tsx';`
	);
	const outfile = path.join(bundleDir, 'dialog.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['module', 'main'],
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		alias: { '@': path.join(here, '..', 'src') },
		external: ['react', 'react/jsx-runtime', 'react-dom']
	});
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	ui = await import(pathToFileURL(outfile).href);
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

// An open dialog with two buttons (after the elements of `before`, before those of `after`), rendered in `parent`,
// its portal container next to it; `focused` lists every button that got the focus.
async function openDialog(parent, focused, before = [], after = []) {
	const container = document.createElement('div');
	const portal = document.createElement('div');
	parent.append(container, portal);
	const button = (name) =>
		React.createElement('button', { type: 'button', key: name, onFocus: () => focused.push(name) }, name);
	const root = createRoot(container);
	await act(async () =>
		root.render(
			React.createElement(
				ui.PortalContainerContext.Provider,
				{ value: portal },
				React.createElement(
					ui.ShadCnDialog,
					{ open: true },
					React.createElement(
						ui.DialogContent,
						{ 'aria-describedby': undefined },
						React.createElement(ui.DialogTitle, null, 'Sign In'),
						...before,
						button('first'),
						button('second'),
						...after
					)
				)
			)
		)
	);
	return { root, portal };
}

test('in a shadow root the dialog takes the focus itself, without running through its elements', async () => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: 'open' });
	const focused = [];
	const { root, portal } = await openDialog(shadow, focused);

	assert.deepEqual(focused, []);
	assert.equal(shadow.activeElement, portal.querySelector('[role="dialog"]'));
	await act(async () => root.unmount());
});

test('in a page the dialog focuses its first element, as before', async () => {
	const focused = [];
	const { root } = await openDialog(document.body, focused);

	assert.equal(focused[0], 'first');
	assert.equal(document.activeElement.textContent, 'first');
	await act(async () => root.unmount());
});

test('in a shadow root Tab loops inside the dialog instead of leaving it for the page', async () => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: 'open' });
	const { root, portal } = await openDialog(shadow, []);
	const buttons = [...portal.querySelector('[role="dialog"]').querySelectorAll('button')];
	const first = buttons[0];
	const last = buttons.at(-1);
	const tab = (element, shiftKey) =>
		element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, composed: true }));

	await act(async () => last.focus());
	await act(async () => tab(last, false));
	assert.equal(shadow.activeElement, first, 'Tab on the last element goes back to the first');

	await act(async () => tab(first, true));
	assert.equal(shadow.activeElement, last, 'Shift+Tab on the first element goes to the last');
	await act(async () => root.unmount());
});

test('in a shadow root the Tab loop skips the controls Tab cannot reach', async () => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: 'open' });
	const hidden = [
		React.createElement('input', { type: 'hidden', key: 'token', name: 'token', value: 'x' }),
		React.createElement('button', { type: 'button', key: 'hidden', hidden: true }, 'hidden')
	];
	const { root, portal } = await openDialog(shadow, [], hidden);
	const buttons = [...portal.querySelector('[role="dialog"]').querySelectorAll('button:not([hidden])')];
	const first = buttons[0];
	const last = buttons.at(-1);

	await act(async () => first.focus());
	await act(async () =>
		first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, composed: true }))
	);
	assert.equal(first.textContent, 'first');
	assert.equal(shadow.activeElement, last, 'Shift+Tab on the first shown control goes to the last');
	await act(async () => root.unmount());
});

test('in a shadow root the Tab loop skips a control in a display: none box', async () => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: 'open' });
	const gone = React.createElement(
		'div',
		{ key: 'gone', style: { display: 'none' } },
		React.createElement('button', { type: 'button' }, 'gone')
	);
	const { root, portal } = await openDialog(shadow, [], [gone]);
	const dialog = portal.querySelector('[role="dialog"]');
	const named = (text) =>
		[...dialog.querySelectorAll('button')].find((element) => element.textContent.includes(text));
	const first = named('first');
	const close = named('Close');
	const tab = (element, shiftKey) =>
		element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, composed: true }));

	await act(async () => first.focus());
	await act(async () => tab(first, true));
	assert.equal(shadow.activeElement, close, 'Shift+Tab on the first drawn control goes to the last one');

	await act(async () => tab(close, false));
	assert.equal(shadow.activeElement, first, 'Tab on the last control skips the one not drawn');
	await act(async () => root.unmount());
});

test('in a shadow root a Tab a control of the dialog handled itself is left to it', async () => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: 'open' });
	const keepsShiftTab = React.createElement('textarea', {
		key: 'note',
		onKeyDown: (event) => {
			if (event.key === 'Tab') {
				event.preventDefault();
			}
		}
	});
	const { root, portal } = await openDialog(shadow, [], [keepsShiftTab]);
	const note = portal.querySelector('textarea');

	await act(async () => note.focus());
	const keydown = new KeyboardEvent('keydown', {
		key: 'Tab',
		shiftKey: true,
		bubbles: true,
		composed: true,
		cancelable: true
	});
	await act(async () => note.dispatchEvent(keydown));

	assert.equal(keydown.defaultPrevented, true, 'the textarea cancels the Tab itself');
	assert.equal(shadow.activeElement, note);
	await act(async () => root.unmount());
});

// The kit's Dialog, open, with `props` (#5642): its content, and the warnings printed while it opened. It closes when
// the test ends, passed or failed.
async function openKitDialog(t, props) {
	const warnings = [];
	const originalWarn = console.warn;
	console.warn = (message) => warnings.push(String(message));
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	t.after(() => act(async () => root.unmount()));
	try {
		await act(async () =>
			root.render(
				React.createElement(ui.Dialog, { open: true, title: 'Sign In', hideTitle: true, ...props }, 'form')
			)
		);
	} finally {
		console.warn = originalWarn;
	}
	return { warnings, content: document.querySelector('[role="dialog"]') };
}

test('a kit dialog without a description says so: no warning, and nothing it is described by', async (t) => {
	const { warnings, content } = await openKitDialog(t, {});

	assert.deepEqual(
		warnings.filter((warning) => warning.includes('Missing `Description`')),
		[]
	);
	assert.equal(content.hasAttribute('aria-describedby'), false);
});

test('a kit dialog with a description is described by it', async (t) => {
	const { content } = await openKitDialog(t, { description: 'Track your time from this site.' });
	const describedBy = content.getAttribute('aria-describedby');

	assert.equal(document.getElementById(describedBy).textContent, 'Track your time from this site.');
});
