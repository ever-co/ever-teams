// The report reads follow the employee a manager picks (ever-co/ever-teams#5631): node --test test/*.test.mjs (from
// packages/toolkit/atoms). bundle-kit.mjs bundles the report, worked time, project, task and apps hooks; the kit's
// context is a stand-in for a signed-in person who is also an employee, and the API package records what each read
// asks for.
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
	// The apps read hands the employee to @ever-teams/api, which turns it into the query (its
	// test/activities-employee.test.mjs): the stand-in records the employee it is handed.
	'@ever-teams/api': `export const isEmbedToken = () => false;
		export const ApiCall = async (request) => {
			globalThis.__reads.push(request);
			return { data: [] };
		};
		export const getActivitiesStats = async ({ selectedEmployee }) => {
			globalThis.__reads.push({ path: 'getActivitiesStats', body: { employeeIds: [selectedEmployee] } });
			return {};
		};`,
	context: `export const useTeamsContext = () => globalThis.__context;`
};
const standInOf = (importPath) => {
	if (importPath.endsWith('context/teams-context')) {
		return 'context';
	}
	return Object.keys(standIns).find((name) => importPath === name);
};

const manager = [{ permission: 'CHANGE_SELECTED_EMPLOYEE' }];
const member = [{ permission: 'TIME_TRACKER' }];
const user = { id: 'user-ines', tenantId: 'tenant-1', employee: { id: 'employee-ines' } };
// One object for every render: a read starts again only for what changed.
const reportDates = { from: new Date('2026-11-16'), to: new Date('2026-11-22') };

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
			export { useStatisticsCounts } from '${kitSources}/hooks/useStatisticsCounts.ts';
			export { useProjectsStats } from '${kitSources}/hooks/useProjectsStats.ts';
			export { useTasksStats } from '${kitSources}/hooks/useTasksStats.ts';
			export { useActivitiesStats } from '${kitSources}/hooks/useActivitiesStats.ts';`,
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
	root = undefined;
	document.body.replaceChildren();
});

function Reads() {
	kit.useReport();
	kit.useStatisticsCounts();
	kit.useProjectsStats();
	kit.useTasksStats();
	kit.useActivitiesStats();
	return null;
}

// Renders the reads (again) with this employee in the kit's state and these permissions, and gives the employee each
// read asks for, by route: in its query, or in its body.
async function employeesAskedFor(selectedEmployee, userPermissions) {
	globalThis.__reads = [];
	globalThis.__context = {
		authenticatedUser: user,
		token: 'token-1',
		selectedEmployee,
		userPermissions,
		selectedTeam: 'all',
		selectedOrganization: 'org-1',
		reportDates
	};
	root ??= createRoot(document.createElement('div'));
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

// What every read asks for: the apps read hands its employee to @ever-teams/api, "all" for the person's own.
function everyRead(employee, { apps = employee } = {}) {
	return {
		'/timesheet/time-log/report/weekly': employee,
		'/timesheet/statistics/counts': employee,
		'/timesheet/statistics/projects': employee,
		'/timesheet/statistics/tasks': employee,
		getActivitiesStats: apps
	};
}

test('the report, the worked time, the projects, the tasks and the apps read the employee a manager picked', async () => {
	const asked = await employeesAskedFor('employee-maximiliana', manager);

	assert.deepEqual(asked, everyRead('employee-maximiliana'));
});

test('with "All employees", they read the signed-in person own, as before', async () => {
	const asked = await employeesAskedFor('all', manager);

	assert.deepEqual(asked, everyRead('employee-ines', { apps: 'all' }));
});

test('a person who may not pick reads their own, whatever employee the kit state holds', async () => {
	const asked = await employeesAskedFor('employee-maximiliana', member);

	assert.deepEqual(asked, everyRead('employee-ines', { apps: 'all' }));
});

test('before the permissions are read, the reads ask for the person own, then for the employee picked', async () => {
	const before = await employeesAskedFor('employee-maximiliana', null);
	assert.deepEqual(before, everyRead('employee-ines', { apps: 'all' }));

	const after = await employeesAskedFor('employee-maximiliana', manager);
	assert.deepEqual(after, everyRead('employee-maximiliana'));
});
