// The timesheet's loader covers its table from outside it, so the table body holds rows only (ever-co/ever-teams#5616):
// node --test test/*.test.mjs (from packages/toolkit/atoms). bundle-kit.mjs bundles TeamsTimesheet with its time logs
// hook, the kit's context and the toolkit-ui parts as stand-ins; the table parts draw the real table elements. React
// renders it to static markup. Its title names the selected organization only when it is known (#5644).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const element = (tag) =>
	`(props) => createElement('${tag}', { className: props.className, colSpan: props.colSpan }, props.children)`;
const children = '({ children }) => children ?? null';
const nothing = '() => null';
const standIns = {
	'@ever-teams/toolkit-ui': `import { createElement } from 'react';
		export const cn = (...names) => names.filter(Boolean).join(' ');
		export const Table = ${element('table')};
		export const TableHeader = ${element('thead')};
		export const TableBody = ${element('tbody')};
		export const TableRow = ${element('tr')};
		export const TableHead = ${element('th')};
		export const TableCell = ${element('td')};
		export const Avatar = ${nothing};
		export const Badge = ${children};
		export const Button = ${children};
		export const DatePicker = ${nothing};
		export const MultiSelect = ${children};
		export const MultiSelectContent = ${children};
		export const MultiSelectGroup = ${children};
		export const MultiSelectItem = ${children};
		export const MultiSelectTrigger = ${children};
		export const MultiSelectValue = ${nothing};
		export const Select = ${children};
		export const Card = ${children};`,
	// The key, and the organization's name when the title is given one.
	'react-i18next': `export const useTranslation = () => ({
		t: (key, values) => (values?.orgName ? key + ': ' + values.orgName : key)
	});`,
	'lucide-react': `export const ChevronLeft = ${nothing};
		export const ChevronRight = ${nothing};
		export const FileText = ${nothing};
		export const RefreshCwIcon = ${nothing};
		export const LoaderCircle = () => 'loader';`,
	timeLogs: `export const useTimeLogs = () => ({ loading: globalThis.timeLogsLoading, data: [], error: null, refetch() {} });`,
	timerOnly: 'export const useTimerOnlyToken = () => false;',
	context: `export const useTeamsContext = () => ({
		userOrganizations: globalThis.timesheetOrganizations ?? null,
		selectedOrganization: 'org-1'
	});`,
	parts: `export const TeamsTimerFooter = ${nothing};
		export const TeamsActiveEmployeeSelector = ${nothing};
		export const TimerOnlyReportNote = ${nothing};`
};
const BY_PATH = [
	['hooks/useTimeLogs', 'timeLogs'],
	['hooks/useTimerOnlyToken', 'timerOnly'],
	['context/teams-context', 'context'],
	['component-footer', 'parts'],
	['teams-active-employee-selector', 'parts'],
	['timer-only-report-note', 'parts']
];
const standInOf = (importPath) => {
	const byPath = BY_PATH.find(([part]) => importPath.endsWith(part));
	if (byPath) {
		return byPath[1];
	}
	return Object.keys(standIns).find((name) => importPath === name);
};

let kit;
let removeBundle;

before(async () => {
	const bundle = await bundleKit({
		name: 'timesheet-markup',
		entry: `export { TeamsTimesheet } from '${kitSources}/components/teams-report/timesheet/teams-timesheet.tsx';`,
		standIns,
		standInOf,
		external: ['react-dom/server']
	});
	kit = bundle.bundled;
	removeBundle = bundle.remove;
});

after(() => removeBundle?.());

function timesheetOf(loading, props = {}) {
	globalThis.timeLogsLoading = loading;
	const { createElement } = require('react');
	const { renderToStaticMarkup } = require('react-dom/server');
	const markup = renderToStaticMarkup(createElement(kit.TeamsTimesheet, props));
	return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

test('while the time logs load, the loader covers the table from outside it, and the table body holds rows only', () => {
	const page = timesheetOf(true);
	const table = page.querySelector('table');

	const tags = [...table.tBodies[0].children].map((child) => child.tagName.toLowerCase());
	assert.deepEqual(new Set(tags), new Set(['tr']));
	assert.doesNotMatch(table.textContent, /loader/, 'nothing of the loader inside the table');
	const box = table.parentElement;
	assert.match(box.className, /\brelative\b/, 'the table sits in a positioned box');
	assert.match(box.textContent, /loader/, 'the loader shows in that box, beside the table');
});

test('the table has as many rows while the time logs load as once they are read, so nothing moves', () => {
	const rowsOf = (loading) => timesheetOf(loading).querySelectorAll('table tr').length;

	assert.equal(rowsOf(true), rowsOf(false));
});

test("the empty row's cell spans every column, the employee's one included", () => {
	for (const showEmployee of [false, true]) {
		const page = timesheetOf(false, { showEmployee });
		const columns = page.querySelectorAll('thead th').length;

		const spans = [...page.querySelectorAll('tbody td')].map((cell) => cell.colSpan);
		assert.deepEqual(spans, [columns], `showEmployee: ${showEmployee}`);
	}
});

test('once they are read, the loader is gone', () => {
	const page = timesheetOf(false);

	assert.doesNotMatch(page.body.textContent, /loader/);
	assert.equal(page.querySelectorAll('tbody tr').length, 1, 'the empty table says so in one row');
});

function titleWith(organizations) {
	globalThis.timesheetOrganizations = organizations;
	try {
		return timesheetOf(false).querySelector('h2').textContent;
	} finally {
		globalThis.timesheetOrganizations = undefined;
	}
}

test('signed out, or before the organizations are read, the title names no organization', () => {
	assert.equal(titleWith(null), 'title_without_organization');
	assert.equal(titleWith({ items: [] }), 'title_without_organization');
});

test('once the selected organization is known, the title names it', () => {
	const organizations = { items: [{ organizationId: 'org-1', organization: { name: 'Northwind Studio' } }] };

	assert.equal(titleWith(organizations), 'title: Northwind Studio');
});
