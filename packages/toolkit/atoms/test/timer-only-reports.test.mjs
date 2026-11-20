// The report widgets with an embed token (ever-co/ever-teams#5602): node --test test/*.test.mjs (from
// packages/toolkit/atoms, after the toolkit-types and api builds). The embed token the host's getToken answers reaches
// the timer only, and the API refuses every report route to it: the widgets say where to see the report and read nothing.
// Any other token reads as before. A stand-in fetch records every request; charts, pickers and loaders are stand-ins.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandIns, recordingFetch } from './kit-stand-ins.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const API = 'https://api.example.com/api';
const NOTE = 'REPORT.timer_only';
// Each report widget, and the route it reads, which the API refuses to an embed token.
const WIDGETS = {
	TeamsDailyWorkedTimeDisplayer: '/timesheet/statistics/counts',
	TeamsWeeklyWorkedTimeDisplayer: '/timesheet/statistics/counts',
	TeamsDailyActivityDisplayer: '/timesheet/statistics/counts',
	TeamsWeeklyActivityDisplayer: '/timesheet/statistics/counts',
	TeamsWorkedProjectDisplayer: '/timesheet/statistics/counts',
	TeamsProjectsList: '/timesheet/statistics/projects',
	TeamsTasksList: '/timesheet/statistics/tasks',
	TeamsAppsUrlList: '/timesheet/statistics/activities',
};
const REPORT_ROUTES = new Set(Object.values(WIDGETS));
const LIST_ROUTES = [
	'/timesheet/statistics/projects',
	'/timesheet/statistics/tasks',
	'/timesheet/statistics/activities',
	'/timesheet/time-log'
];

const nothing = '() => null';
const children = '({ children }) => children ?? null';
const toolkitUi = `${kitStandIns['@ever-teams/toolkit-ui']}
	export const Badge = ${children};
	export const DatePicker = ${nothing};
	export const MultiSelect = ${children};
	export const MultiSelectContent = ${children};
	export const MultiSelectGroup = ${children};
	export const MultiSelectItem = ${children};
	export const MultiSelectTrigger = ${children};
	export const MultiSelectValue = ${nothing};
	export const Select = ${children};
	export const Table = ${children};
	export const TableBody = ${children};
	export const TableCell = ${children};
	export const TableHead = ${children};
	export const TableHeader = ${children};
	export const TableRow = ${children};
	export const Progress = ${nothing};
	export const formatTime = (seconds) => 'time:' + seconds;
	export const areDatesEqual = () => true;`;
const standIns = {
	...kitStandIns,
	'@ever-teams/toolkit-ui': toolkitUi,
	'lucide-react': `${kitStandIns['lucide-react']}
		export const ChevronLeft = ${nothing};
		export const ChevronRight = ${nothing};
		export const FileText = ${nothing};
		export const RefreshCwIcon = ${nothing};`,
	charts: `export const BarChart = ${nothing};
		export const BarChartHorizontal = ${nothing};
		export const LineChart = ${nothing};
		export const AreaChart = ${nothing};
		export const TooltipChart = ${nothing};
		export const RadialChart = ${nothing};
		export const RadarChart = ${nothing};`,
	pickers: `export const TeamsActiveEmployeeSelector = ${nothing};
		export const TeamsReportDatesRangePicker = ${nothing};`,
	loaders: `export const TeamsDisplayerLoader = ${nothing};
		export const ChartLoader = ${nothing};
		export const SpinOverlayLoader = ${nothing};`,
	footer: `export const TeamsTimerFooter = ${nothing};`
};
const PATH_STAND_INS = [
	['/teams-ui-charts/', 'charts'],
	['/inputs/teams-active-employee-selector', 'pickers'],
	['/inputs/teams-report-dates-range-picker', 'pickers'],
	['/components/loaders/', 'loaders'],
	['/layouts/footers/component-footer', 'footer']
];
// The kit's modules are named by path once the aliases resolved them; packages by their name.
const standInOf = (importPath) => {
	const byPath = PATH_STAND_INS.find(([part]) => importPath.includes(part));
	if (byPath) {
		return byPath[1];
	}
	return Object.keys(kitStandIns).find((name) => importPath === name);
};

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let requests;
const roots = [];

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'timer-only-reports',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { TeamsDailyWorkedTimeDisplayer, TeamsWeeklyWorkedTimeDisplayer } from '${kitSources}/components/teams-ui-components/report-displayer.tsx';
			export { TeamsDailyActivityDisplayer, TeamsWeeklyActivityDisplayer } from '${kitSources}/components/teams-ui-components/activity-displayer.tsx';
			export { TeamsWorkedProjectDisplayer } from '${kitSources}/components/teams-ui-components/project-displayer.tsx';
			export { TeamsBasicReport } from '${kitSources}/components/teams-report/basic-report/teams-basic-report.tsx';
			export { TeamsProjectsList } from '${kitSources}/components/teams-report/list-report/projects-list.tsx';
			export { TeamsTasksList } from '${kitSources}/components/teams-report/list-report/tasks-list.tsx';
			export { TeamsAppsUrlList } from '${kitSources}/components/teams-report/list-report/apps-url-list.tsx';
			export { TeamsTimesheet } from '${kitSources}/components/teams-report/timesheet/teams-timesheet.tsx';`,
		standIns,
		standInOf
	});
	kit = bundled;
	removeBundle = remove;
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
});

after(() => {
	removeBundle?.();
});

afterEach(async () => {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
	document.body.replaceChildren();
	localStorage.clear();
});

const tokenWith = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
const EMBED_TOKEN = tokenWith({ id: 'user-1', organizationId: 'org-1', embedCredentialId: 'credential-1' });
const FULL_TOKEN = tokenWith({ id: 'user-1', organizationId: 'org-1' });

// The host's backend: getToken answers the token it is given, for 15 minutes.
const getTokenAnswering = (token) => async () => ({
	token,
	expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
});

async function settle() {
	for (let round = 0; round < 20; round += 1) {
		await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
	}
}

async function openReports(config) {
	requests = [];
	const recording = recordingFetch(requests);
	// The lists' routes answer a list, empty here; recordingFetch answers the rest.
	globalThis.fetch = async (url, init) => {
		const answer = await recording(url, init);
		const path = new URL(url).pathname.replace(/^\/api/, '');
		if (LIST_ROUTES.includes(path)) {
			return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
		}
		return answer;
	};
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	const widgets = Object.keys(WIDGETS).map((name) => React.createElement(kit[name], { key: name }));
	const tree = React.createElement(kit.TeamsProvider, { config, onSignOut() {} }, ...widgets);
	await act(async () => root.render(tree));
	await settle();
}

const notesShown = () => document.body.textContent.split(NOTE).length - 1;
const reportReads = () => requests.filter(({ path }) => REPORT_ROUTES.has(path));

function assertEachWidgetReads() {
	const read = new Set(reportReads().map(({ path }) => path));
	for (const [widget, route] of Object.entries(WIDGETS)) {
		assert.ok(read.has(route), `${widget} reads ${route}`);
	}
}

test("with the embed token of the host's getToken, every report widget says where to see it and reads nothing", async () => {
	await openReports({ apiUrl: API, getToken: getTokenAnswering(EMBED_TOKEN) });

	assert.ok(
		requests.some(({ path }) => path === '/user/me'),
		'the kit signed the person in'
	);
	assert.deepEqual(reportReads(), [], 'no report route is read');
	assert.equal(notesShown(), Object.keys(WIDGETS).length, 'each widget shows the note');
});

test("with the kit's own sign-in, the report widgets read as before and show no note", async () => {
	const saved = { app: { user: null }, persist: { token: 'token-1', expiry: Date.now() + 60 * 60 * 1000 } };
	localStorage.setItem('_teams-store', JSON.stringify(saved));
	await openReports({ apiUrl: API });

	assertEachWidgetReads();
	assert.equal(notesShown(), 0);
});

test('a getToken that answers a token other than an embed token keeps the reports as they are', async () => {
	await openReports({ apiUrl: API, getToken: getTokenAnswering(FULL_TOKEN) });

	assertEachWidgetReads();
	assert.equal(notesShown(), 0);
});
