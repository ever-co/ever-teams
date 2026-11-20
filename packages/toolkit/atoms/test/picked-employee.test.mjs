// The report reads follow the employee a manager picks (ever-co/ever-teams#5631): node --test test/*.test.mjs (from
// packages/toolkit/atoms). bundle-kit.mjs bundles the report, project and task hooks; the kit's context is a stand-in
// for a signed-in manager who is also an employee, and the API package records what each read asks for.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandIns } from './kit-stand-ins.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const standIns = {
	'@ever-teams/toolkit-ui': kitStandIns['@ever-teams/toolkit-ui'],
	'react-i18next': kitStandIns['react-i18next'],
	'@ever-teams/api': `export const isEmbedToken = () => false;
		export const ApiCall = async (request) => {
			globalThis.__reads.push(request);
			return { data: [] };
		};`,
	context: `export const useTeamsContext = () => globalThis.__context;`
};
const standInOf = (importPath) => {
	if (importPath.endsWith('context/teams-context')) {
		return 'context';
	}
	return Object.keys(standIns).find((name) => importPath === name);
};

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let root;

before(async () => {
	const bundle = await bundleKit({
		name: 'picked-employee',
		entry: `export { useReport } from '${kitSources}/hooks/useReport.ts';
			export { useProjectsStats } from '${kitSources}/hooks/useProjectsStats.ts';
			export { useTasksStats } from '${kitSources}/hooks/useTasksStats.ts';`,
		standIns,
		standInOf
	});
	kit = bundle.bundled;
	removeBundle = bundle.remove;
	React = require('react');
	act = React.act;
	createRoot = require('react-dom/client').createRoot;
});

after(() => removeBundle?.());

afterEach(async () => {
	await act(async () => root?.unmount());
	document.body.replaceChildren();
});

function Reads() {
	kit.useReport();
	kit.useProjectsStats();
	kit.useTasksStats();
	return null;
}

// The employees each read asks for, by route: in its query, or in its body.
async function employeesAskedFor(selectedEmployee) {
	globalThis.__reads = [];
	globalThis.__context = {
		authenticatedUser: { id: 'user-ines', tenantId: 'tenant-1', employee: { id: 'employee-ines' } },
		token: 'token-1',
		selectedEmployee,
		selectedTeam: 'all',
		selectedOrganization: 'org-1',
		reportDates: { from: new Date('2026-11-16'), to: new Date('2026-11-22') }
	};
	root = createRoot(document.createElement('div'));
	await act(async () => root.render(React.createElement(Reads)));
	await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
	const asked = {};
	for (const read of globalThis.__reads) {
		const route = read.path.split('?')[0];
		const query = decodeURIComponent(read.path.split('?')[1] ?? '');
		const fromQuery = /employeeIds\[0\]=([^&]+)/.exec(query)?.[1];
		asked[route] = fromQuery ?? read.body?.employeeIds?.[0];
	}
	return asked;
}

test('the report, the projects and the tasks read the employee a manager picked', async () => {
	const asked = await employeesAskedFor('employee-maximiliana');

	assert.deepEqual(asked, {
		'/timesheet/time-log/report/weekly': 'employee-maximiliana',
		'/timesheet/statistics/projects': 'employee-maximiliana',
		'/timesheet/statistics/tasks': 'employee-maximiliana'
	});
});

test('with "All employees", they read the signed-in person own, as before', async () => {
	const asked = await employeesAskedFor('all');

	assert.deepEqual(asked, {
		'/timesheet/time-log/report/weekly': 'employee-ines',
		'/timesheet/statistics/projects': 'employee-ines',
		'/timesheet/statistics/tasks': 'employee-ines'
	});
});
