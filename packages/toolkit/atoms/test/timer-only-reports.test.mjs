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
	TeamsBasicReport: '/timesheet/time-log/report/weekly',
	TeamsProjectsList: '/timesheet/statistics/projects',
	TeamsTasksList: '/timesheet/statistics/tasks',
	TeamsAppsUrlList: '/timesheet/statistics/activities',
	TeamsTimesheet: '/timesheet/time-log'
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
	const bundle = await bundleKit({
		name: 'timer-only-reports',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { TeamsDailyWorkedTimeDisplayer, TeamsWeeklyWorkedTimeDisplayer } from '${kitSources}/components/teams-ui-components/report-displayer.tsx';
			export { TeamsDailyActivityDisplayer, TeamsWeeklyActivityDisplayer } from '${kitSources}/components/teams-ui-components/activity-displayer.tsx';
			export { TeamsWorkedProjectDisplayer } from '${kitSources}/components/teams-ui-components/project-displayer.tsx';
			export { TeamsBasicReport } from '${kitSources}/components/teams-report/basic-report/teams-basic-report.tsx';
			export { TeamsProjectsList } from '${kitSources}/components/teams-report/list-report/projects-list.tsx';
			export { TeamsTasksList } from '${kitSources}/components/teams-report/list-report/tasks-list.tsx';
			export { TeamsAppsUrlList } from '${kitSources}/components/teams-report/list-report/apps-url-list.tsx';
			export { TeamsTimesheet } from '${kitSources}/components/teams-report/timesheet/teams-timesheet.tsx';
			export { useTimeLogs } from '${kitSources}/hooks/useTimeLogs.ts';
			export { useTeamsContext } from '${kitSources}/context/teams-context.ts';`,
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

async function closePages() {
	const opened = roots.splice(0);
	await act(async () => {
		for (const root of opened) {
			root.unmount();
		}
	});
	document.body.replaceChildren();
}

// Each test unmounts the pages it opened, and leaves the document and the storage empty.
afterEach(async () => {
	await closePages();
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

// The time logs answers held until the test lets them go.
const heldTimeLogs = { holding: false, waiting: [] };

async function openPage(config, children) {
	requests = [];
	const recording = recordingFetch(requests);
	// The lists' routes answer a list, empty here; recordingFetch answers the rest.
	globalThis.fetch = async (url, init) => {
		const answer = await recording(url, init);
		const path = new URL(url).pathname.replace(/^\/api/, '');
		if (!LIST_ROUTES.includes(path)) {
			return answer;
		}
		if (path === '/timesheet/time-log' && heldTimeLogs.holding) {
			await new Promise((release) => heldTimeLogs.waiting.push(release));
		}
		return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
	};
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	const tree = React.createElement(kit.TeamsProvider, { config, onSignOut() {} }, ...children);
	await act(async () => root.render(tree));
	await settle();
}

const openReports = (config) =>
	openPage(
		config,
		Object.keys(WIDGETS).map((name) => React.createElement(kit[name], { key: name }))
	);

const notesShown = () => document.body.textContent.split(NOTE).length - 1;
const reportReads = () => requests.filter(({ path }) => REPORT_ROUTES.has(path));

// The session the kit's own sign-in saves, with the token the person signed in with.
const saveSession = (token) => {
	const saved = { app: { user: null }, persist: { token, expiry: Date.now() + 60 * 60 * 1000 } };
	localStorage.setItem('_teams-store', JSON.stringify(saved));
};

// Each widget on a page of its own: a widget that stopped reading is not hidden by another one reading the same route.
async function assertEachWidgetReadsAlone(config, beforeEachPage = () => {}) {
	for (const [widget, route] of Object.entries(WIDGETS)) {
		beforeEachPage();
		await openPage(config, [React.createElement(kit[widget], { key: widget })]);
		const read = reportReads().map(({ path }) => path);
		assert.ok(read.includes(route), `${widget} reads ${route}`);
		assert.equal(notesShown(), 0, `${widget} shows no note`);
		await closePages();
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

test("with the kit's own sign-in, each report widget reads as before and shows no note", async () => {
	await assertEachWidgetReadsAlone({ apiUrl: API }, () => saveSession('token-1'));
});

test('a getToken that answers a token other than an embed token keeps each report as it is', async () => {
	await assertEachWidgetReadsAlone({ apiUrl: API, getToken: getTokenAnswering(FULL_TOKEN) });
});

// A host's own component on the time logs hook: what it holds, its refetch, and the kit's token.
const probe = {};
function TimeLogsProbe() {
	const { data, loading, refetch } = kit.useTimeLogs();
	const { setToken } = kit.useTeamsContext();
	Object.assign(probe, { data, loading, refetch, setToken });
	return null;
}

test('the time logs hook drops its logs and a pending read once the token is an embed token, and its refetch sends nothing', async () => {
	await openPage({ apiUrl: API, getToken: getTokenAnswering(FULL_TOKEN) }, [
		React.createElement(TimeLogsProbe, { key: 'probe' })
	]);
	assert.deepEqual(probe.data, [], 'read with the full token');

	heldTimeLogs.holding = true;
	await act(async () => {
		void probe.refetch();
	});
	await act(async () => probe.setToken(EMBED_TOKEN));
	heldTimeLogs.holding = false;
	await act(async () => {
		for (const release of heldTimeLogs.waiting.splice(0)) {
			release();
		}
	});
	await settle();
	assert.equal(probe.data, null, 'the logs of the full token and its late answer are gone');
	assert.equal(probe.loading, false);

	requests.length = 0;
	await act(async () => probe.refetch());
	assert.deepEqual(reportReads(), [], 'refetch sends nothing');
});
