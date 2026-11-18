// A client's spent time, drawn from what the host's backend returns: node --test test/*.test.mjs (from
// packages/toolkit/atoms). esbuild bundles the widget and its hook with toolkit-ui's own Card, Progress and duration
// formatter, the translations read from the kit's locale files, and the statistics hooks of the report tiles replaced
// by stand-ins; React renders it in jsdom, and the host's backend is a stand-in whose answers each test settles.
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
const toolkitUi = path.join(here, '..', '..', '..', 'toolkit-ui', 'src', 'lib').replace(/\\/g, '/');
const locale = (lang) => JSON.parse(fs.readFileSync(path.join(lib, 'i18n', 'locales', `${lang}.json`), 'utf8'));

// The kit's words in the language of the test, with {{name}} replaced as i18next does.
let words = locale('en');
globalThis.translate = (key, values = {}) => {
	const text = key.split('.').reduce((group, part) => group?.[part], words);
	if (typeof text !== 'string') {
		return key;
	}
	return text.replace(/{{(\w+)}}/g, (_, name) => values[name] ?? '');
};

const stubs = {
	'react-i18next': 'export const useTranslation = () => ({ t: globalThis.translate });',
	'@ever-teams/toolkit-ui': `import { createContext } from 'react';
		export { areDatesEqual, cn, formatTime, getWeekStartAndEnd } from '${toolkitUi}/utils/utils.ts';
		export { Card } from '${toolkitUi}/components/card.tsx';
		export { Progress } from '${toolkitUi}/components/progress.tsx';
		export const PortalContainerContext = createContext(null);`,
	// The theme color Progress paints its bar with: none, so the bar keeps its classes.
	'themed-button': 'export const useThemeColor = () => undefined;',
	// What the tiles' own data hooks read: the client report never calls them.
	'teams-context': 'export const useTeamsContext = () => ({});',
	'statistics-counts': 'export const useStatisticsCounts = () => ({ data: null, loading: false });'
};
// The stub an import names, if any: the aliases have already turned `@lib/...` and `@hooks/...` into paths.
function stubOf(importPath) {
	const request = importPath.replace(/\\/g, '/');
	if (request === 'react-i18next' || request === '@ever-teams/toolkit-ui') {
		return request;
	}
	if (request === './themed-button') {
		return 'themed-button';
	}
	if (request.endsWith('/context/teams-context')) {
		return 'teams-context';
	}
	if (request.endsWith('hooks/useStatisticsCounts')) {
		return 'statistics-counts';
	}
	return undefined;
}

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
	fs.writeFileSync(
		entry,
		`export { useClientTimeReport } from '${source}/hooks/useClientTimeReport.ts';
		export { TeamsClientTimeReport } from '${source}/components/teams-report/client-report/teams-client-time-report.tsx';`
	);
	const outfile = path.join(bundleDir, 'report.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		// A neutral build reads no main field by default.
		mainFields: ['module', 'main'],
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime', 'react-dom'],
		alias: {
			'@components': path.join(lib, 'components'),
			'@hooks': path.join(lib, 'hooks'),
			'@lib': lib
		},
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					// toolkit-ui's own alias, for the Card's import of its class helper.
					build.onResolve({ filter: /^@\/lib\// }, (args) => ({
						path: `${toolkitUi}/${args.path.slice('@/lib/'.length)}.ts`
					}));
					build.onResolve({ filter: /.*/ }, (args) => {
						const stub = stubOf(args.path);
						if (stub === undefined) {
							return undefined;
						}
						return { path: stub, namespace: 'stub' };
					});
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

beforeEach(async () => {
	await unmountAll();
	words = locale('en');
});

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

const QUIET_WEEK = {
	...NORTHWIND,
	today: { date: '2026-11-18', seconds: 0 },
	week: { start: '2026-11-16', end: '2026-11-22', seconds: 0 },
	projects: []
};

const mountWidget = (getReport) => render(React.createElement(kit.TeamsClientTimeReport, { getReport }));

// The time a report tile shows under its label.
function tileTime(container, label) {
	const labelElement = [...container.querySelectorAll('span')].find((span) => span.textContent === label);
	assert.ok(labelElement, `no tile labelled ${label}`);
	return labelElement.parentElement.nextElementSibling.textContent;
}

// Each project row: its name, its duration, and its bar as drawn and as assistive technologies read it.
function projectRows(container) {
	return [...container.querySelectorAll('li')].map((row) => {
		const [name, duration] = row.querySelectorAll('span');
		const bar = row.querySelector('[role="progressbar"]');
		return {
			name: name.textContent,
			duration: duration.textContent,
			bar: {
				name: bar.getAttribute('aria-label'),
				value: bar.getAttribute('aria-valuenow'),
				text: bar.getAttribute('aria-valuetext'),
				drawn: bar.firstElementChild.style.transform
			}
		};
	});
}

const buttonNamed = (container, name) =>
	[...container.querySelectorAll('button')].find((button) => button.textContent === name);

async function click(button) {
	await act(async () => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
}

test('the report names the client, shows today and this week, and the projects by time spent with their bars', async () => {
	const backend = hostBackend();
	const { container } = await mountWidget(backend.getReport);
	await act(async () => backend.calls[0].resolve(NORTHWIND));
	await settle();

	const region = container.querySelector('[role="region"]');
	const heading = container.querySelector('h2');
	assert.equal(region.getAttribute('aria-labelledby'), heading.id);
	assert.equal(region.getAttribute('aria-busy'), 'false');
	assert.equal(heading.textContent, 'Time spent Northwind');
	assert.equal(tileTime(container, 'Today'), '01:30:00');
	assert.equal(tileTime(container, 'This week'), '12:30:00');
	const projects = container.querySelector('section');
	assert.equal(projects.getAttribute('aria-labelledby'), projects.querySelector('h3').id);
	assert.equal(projects.querySelector('h3').textContent, 'By project');
	assert.deepEqual(projectRows(container), [
		{
			name: 'Mobile app',
			duration: '07:30:00',
			bar: { name: 'Mobile app', value: '100', text: '07:30:00', drawn: 'translateX(-0%)' }
		},
		{
			name: 'Website',
			duration: '02:30:00',
			bar: { name: 'Website', value: '33', text: '02:30:00', drawn: 'translateX(-67%)' }
		},
		{
			name: 'Security audit',
			duration: '02:30:00',
			bar: { name: 'Security audit', value: '33', text: '02:30:00', drawn: 'translateX(-67%)' }
		}
	]);
	assert.deepEqual(
		NORTHWIND.projects.map((project) => project.id),
		['p-site', 'p-app', 'p-audit'],
		'the host’s array keeps its order'
	);
	assert.match(container.textContent, /Powered by/);
	assert.equal(container.querySelector('[role="alert"]'), null);
});

test('a host that counts fractions of a second gets whole seconds drawn', async () => {
	const backend = hostBackend();
	const { container } = await mountWidget(backend.getReport);
	await act(async () =>
		backend.calls[0].resolve({
			...NORTHWIND,
			today: { date: '2026-11-18', seconds: 61.5 },
			week: { start: '2026-11-16', end: '2026-11-22', seconds: 3600.9 },
			projects: [{ id: 'p-app', name: 'Mobile app', seconds: 3599.99 }]
		})
	);
	await settle();

	assert.equal(tileTime(container, 'Today'), '00:01:01');
	assert.equal(tileTime(container, 'This week'), '01:00:00');
	const [row] = projectRows(container);
	assert.equal(row.duration, '00:59:59');
	assert.equal(row.bar.text, '00:59:59');
});

test('while the host answers, the widget shows the kit’s loaders and asks once', async () => {
	const backend = hostBackend();
	const { container } = await mountWidget(backend.getReport);
	await settle();

	assert.equal(backend.calls.length, 1);
	assert.equal(container.querySelector('[role="region"]').getAttribute('aria-busy'), 'true');
	assert.equal(container.querySelector('h2').textContent.trim(), 'Time spent');
	assert.equal(container.querySelectorAll('.animate-pulse').length, 2, 'one loader per tile');
	assert.equal(container.querySelector('[role="progressbar"]'), null);
	assert.equal(container.querySelector('[role="alert"]'), null);
});

test('with no time this week the widget says so and names the client', async () => {
	const backend = hostBackend();
	const { container } = await mountWidget(backend.getReport);
	await act(async () => backend.calls[0].resolve(QUIET_WEEK));
	await settle();

	assert.equal(container.querySelector('p').textContent, 'No time spent for Northwind this week.');
	assert.equal(container.querySelector('h3'), null);
	assert.equal(container.querySelector('[role="progressbar"]'), null);
	assert.doesNotMatch(container.textContent, /This week/);
});

test('when the host’s call fails the widget shows an alert, and Try again asks again and shows the report', async () => {
	const backend = hostBackend();
	const { container } = await mountWidget(backend.getReport);
	await act(async () => backend.calls[0].reject(new Error('the portal could not reach Ever Teams')));
	await settle();

	const alert = container.querySelector('[role="alert"]');
	assert.match(alert.textContent, /^The time spent couldn't be loaded\./);
	assert.doesNotMatch(alert.textContent, /could not reach/, 'the host’s own error stays out of the page');

	await click(buttonNamed(alert, 'Try again'));
	assert.equal(backend.calls.length, 2);
	await act(async () => backend.calls[1].resolve(NORTHWIND));
	await settle();
	assert.equal(container.querySelector('[role="alert"]'), null);
	assert.equal(tileTime(container, 'Today'), '01:30:00');
	assert.equal(projectRows(container).length, 3);
});

test('a report that arrives after the widget is gone changes nothing, and React does not warn', async (t) => {
	const errors = t.mock.method(console, 'error', () => {});
	const backend = hostBackend();
	const { container, root } = await mountWidget(backend.getReport);
	await act(async () => root.unmount());

	await act(async () => backend.calls[0].resolve(NORTHWIND));
	await settle();
	assert.equal(container.innerHTML, '');
	assert.equal(errors.mock.callCount(), 0, 'React warned about the late answer');
});

test('with the French locale the widget speaks French', async () => {
	words = locale('fr');
	const backend = hostBackend();
	const report = await mountWidget(backend.getReport);
	await act(async () => backend.calls[0].resolve(NORTHWIND));
	const quiet = hostBackend();
	const empty = await mountWidget(quiet.getReport);
	await act(async () => quiet.calls[0].resolve(QUIET_WEEK));
	const failing = hostBackend();
	const failed = await mountWidget(failing.getReport);
	await act(async () => failing.calls[0].reject(new Error('down')));
	await settle();

	assert.equal(report.container.querySelector('h2').textContent, 'Temps passé Northwind');
	assert.equal(tileTime(report.container, "Aujourd'hui"), '01:30:00');
	assert.equal(tileTime(report.container, 'Cette semaine'), '12:30:00');
	assert.equal(report.container.querySelector('h3').textContent, 'Par projet');
	assert.equal(empty.container.querySelector('p').textContent, 'Aucun temps passé pour Northwind cette semaine.');
	assert.match(
		failed.container.querySelector('[role="alert"]').textContent,
		/^Le temps passé n'a pas pu être chargé\./
	);
	assert.ok(buttonNamed(failed.container, 'Réessayer'));
});

test('both kit locales have the same CLIENT_REPORT keys, and both name the client in the empty sentence', () => {
	const english = locale('en').CLIENT_REPORT;
	const french = locale('fr').CLIENT_REPORT;

	assert.deepEqual(Object.keys(french), Object.keys(english));
	assert.match(english.empty, /{{client}}/);
	assert.match(french.empty, /{{client}}/);
});
