// The timesheet's table body holds rows only, its loader included (ever-co/ever-teams#5616): node --test test/*.test.mjs
// (from packages/toolkit/atoms). bundle-kit.mjs bundles TeamsTimesheet with its time logs hook, the kit's context and
// the toolkit-ui parts as stand-ins; the table parts draw the real table elements. React renders it to static markup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandIns } from './kit-stand-ins.mjs';

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
	'react-i18next': kitStandIns['react-i18next'],
	'lucide-react': `export const ChevronLeft = ${nothing};
		export const ChevronRight = ${nothing};
		export const FileText = ${nothing};
		export const RefreshCwIcon = ${nothing};
		export const LoaderCircle = () => 'loader';`,
	timeLogs: `export const useTimeLogs = () => ({ loading: globalThis.timeLogsLoading, data: [], error: null, refetch() {} });`,
	timerOnly: 'export const useTimerOnlyToken = () => false;',
	context: 'export const useTeamsContext = () => ({ userOrganizations: null, selectedOrganization: null });',
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

function tableBodyOf(loading) {
	globalThis.timeLogsLoading = loading;
	const { createElement } = require('react');
	const { renderToStaticMarkup } = require('react-dom/server');
	const markup = renderToStaticMarkup(createElement(kit.TeamsTimesheet));
	return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document.querySelector('tbody');
}

test('while the time logs load, the table body holds rows only, and the loader shows inside one', () => {
	const body = tableBodyOf(true);

	const tags = [...body.children].map((child) => child.tagName.toLowerCase());
	assert.deepEqual(new Set(tags), new Set(['tr']));
	assert.match(body.textContent, /loader/, 'the loader shows');
});

test('once they are read, no loader row is left', () => {
	const body = tableBodyOf(false);

	assert.doesNotMatch(body.textContent, /loader/);
	assert.equal(body.querySelectorAll('tr').length, 1, 'the empty table says so in one row');
});
