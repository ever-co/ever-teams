// A client's spent time, drawn from what the host's backend returns: node --test test/*.test.mjs (from
// packages/toolkit/atoms). esbuild bundles the report's hook; React renders it in jsdom, and the host's backend is a
// stand-in whose answers each test settles.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const esbuild = require('esbuild');
const lib = path.join(here, '..', 'src', 'lib');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let React;
let act;
let createRoot;
let kit;
let bundleDir;

before(async () => {
	// Next to this file: the bundle's React is then the one this test renders with.
	bundleDir = fs.mkdtempSync(path.join(here, '.client-time-report-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const source = lib.replace(/\\/g, '/');
	fs.writeFileSync(entry, `export { useClientTimeReport } from '${source}/hooks/useClientTimeReport.ts';`);
	const outfile = path.join(bundleDir, 'report.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime']
	});
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	kit = await import(pathToFileURL(outfile).href);
});

const roots = [];

async function unmountAll() {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
}

after(async () => {
	await unmountAll();
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

beforeEach(unmountAll);

const NORTHWIND = {
	client: { id: 'client-1', name: 'Northwind' },
	timeZone: 'Europe/Paris',
	today: { date: '2026-11-18', seconds: 5400 },
	week: { start: '2026-11-16', end: '2026-11-22', seconds: 45000 },
	projects: [
		{ id: 'p-site', name: 'Website', seconds: 9000 },
		{ id: 'p-app', name: 'Mobile app', seconds: 27000 },
		{ id: 'p-audit', name: 'Security audit', seconds: 9000 }
	]
};

// The host's backend: each call waits until the test answers it.
function hostBackend() {
	const backend = { calls: [] };
	backend.getReport = () =>
		new Promise((resolve, reject) => {
			backend.calls.push({ resolve, reject });
		});
	return backend;
}

// Lets the pending answers and the renders they cause settle.
async function settle() {
	for (let i = 0; i < 3; i += 1) {
		await act(async () => {});
	}
}

async function render(element) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => root.render(element));
	return { container, root };
}

// The hook under a component that only records what it returns.
async function mountHook(getReport) {
	const seen = {};
	const Probe = (props) => {
		seen.current = kit.useClientTimeReport(props.getReport);
		return null;
	};
	const { root } = await render(React.createElement(Probe, { getReport }));
	const rerender = (nextGetReport) =>
		act(async () => root.render(React.createElement(Probe, { getReport: nextGetReport })));
	return { seen, root, rerender };
}

test('the hook asks the host once at mount, and a new function from the host does not ask again', async () => {
	const backend = hostBackend();
	const { seen, rerender } = await mountHook(backend.getReport);

	assert.equal(backend.calls.length, 1);
	assert.equal(seen.current.status, 'loading');

	const other = hostBackend();
	await rerender(other.getReport);
	assert.equal(backend.calls.length, 1);
	assert.equal(other.calls.length, 0);

	await act(async () => backend.calls[0].resolve(NORTHWIND));
	await settle();
	assert.equal(seen.current.status, 'ready');
	assert.equal(seen.current.report, NORTHWIND);
	assert.equal(window.localStorage.length, 0, 'nothing is kept in the browser');
	assert.equal(window.sessionStorage.length, 0, 'nothing is kept in the browser');
	assert.equal(document.cookie, '', 'nothing is kept in the browser');
});

test('a failed call is an error; retry asks the host’s latest function and draws its answer', async () => {
	const backend = hostBackend();
	const { seen, rerender } = await mountHook(backend.getReport);
	await act(async () => backend.calls[0].reject(new Error('the portal could not reach Ever Teams')));
	await settle();
	assert.equal(seen.current.status, 'error');
	assert.equal(seen.current.report, null);

	const latest = hostBackend();
	await rerender(latest.getReport);
	await act(async () => seen.current.retry());
	assert.equal(backend.calls.length, 1);
	assert.equal(latest.calls.length, 1);
	assert.equal(seen.current.status, 'loading');

	await act(async () => latest.calls[0].resolve(NORTHWIND));
	await settle();
	assert.equal(seen.current.status, 'ready');
	assert.equal(seen.current.report, NORTHWIND);
});

test('an older call that answers last never replaces the answer of the latest one', async () => {
	const backend = hostBackend();
	const { seen } = await mountHook(backend.getReport);
	await act(async () => seen.current.retry());
	assert.equal(backend.calls.length, 2);

	const latestReport = { ...NORTHWIND, today: { date: '2026-11-18', seconds: 7200 } };
	await act(async () => backend.calls[1].resolve(latestReport));
	await act(async () => backend.calls[0].resolve(NORTHWIND));
	await settle();
	assert.equal(seen.current.report, latestReport);
});

test('after unmount an answer changes nothing and retry asks nothing', async (t) => {
	const errors = t.mock.method(console, 'error', () => {});
	const backend = hostBackend();
	const { seen, root } = await mountHook(backend.getReport);
	const { retry } = seen.current;
	await act(async () => root.unmount());

	await act(async () => backend.calls[0].resolve(NORTHWIND));
	await settle();
	retry();
	assert.equal(backend.calls.length, 1);
	assert.equal(seen.current.status, 'loading');
	assert.equal(errors.mock.callCount(), 0, 'React warned about the late answer');
});
