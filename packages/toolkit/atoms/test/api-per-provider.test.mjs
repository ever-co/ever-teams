// Each TeamsProvider of a page talks to its own API (ever-co/ever-teams#5483): node --test test/*.test.mjs (from
// packages/toolkit/atoms, after the toolkit-types and api builds).
// bundle-kit.mjs bundles TeamsProvider and the kit's hooks with the built @ever-teams/api, and the UI packages and
// translations replaced by stand-ins; React renders them in jsdom, and a stand-in fetch records every request.
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const passThrough = 'export default ({ children }) => children;';
const children = '({ children }) => children ?? null';
const standIns = {
	'@ever-teams/toolkit-ui': `import { createContext, createElement } from 'react';
		export const PortalContainerContext = createContext(null);
		export const Avatar = () => null;
		export const Button = ${children};
		export const Card = ${children};
		export const Checkbox = () => null;
		export const Dialog = ${children};
		export const Input = () => null;
		export const Popover = ${children};
		export const PopoverContent = () => null;
		export const PopoverTrigger = ${children};
		export const Tabs = ${children};
		export const TabsContent = ${children};
		export const TabsListThemed = ${children};
		export const TabsTrigger = ${children};
		export const ThemedButton = ${children};
		export const useThemeColor = () => 'purple';
		export const cn = (...names) => names.filter(Boolean).join(' ');
		export const Toaster = () => null;
		export const toast = () => {};
		export const reportError = () => {};
		export const getErrorMessage = (error) => String(error);
		export const getWeekStartAndEnd = () => ({ start: new Date(0), end: new Date(0) });
		export const getStartAndEndOfDay = () => ({ dayStart: '', dayEnd: '' });
		export const generateChartConfig = () => ({});
		export const transformData = () => [];`,
	'theme-ui': `const passThrough = ({ children }) => children;
		export const ThemeUIProvider = passThrough;`,
	// The sign-out menu is written for theme-ui's JSX, which adds the sx prop to React's.
	'theme-ui/jsx-runtime': "export { jsx, jsxs, Fragment } from 'react/jsx-runtime';",
	'lucide-react': `export const CheckIcon = () => null;
		export const Copy = () => null;
		export const LoaderCircle = () => null;
		export const LogOutIcon = () => null;`,
	'next-themes': `const passThrough = ({ children }) => children;
		export const ThemeProvider = passThrough;
		export const useTheme = () => ({ setTheme() {} });`,
	'react-i18next': `export const useTranslation = () => ({ t: (key) => key });
		export const I18nextProvider = ({ children }) => children;`,
	'@lib/i18n/init': 'export default {};',
	'@hooks/useProviderLanguage': 'export const useProviderLanguage = () => {};',
	'@hooks/useFontSelector': 'export default () => ({ fontOptions: [], selectedFont: "", setSelectedFont() {} });',
	'@lib/context/teams-tracking-context': passThrough
};
// The stand-in an import names, as the kit's modules write it.
const standInOf = (importPath) => Object.keys(standIns).find((name) => importPath === name);

const USER = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'org-1' } };
// What the stand-in API answers, by the path under /api; anything else gets an empty object.
const ANSWERS = {
	'/auth/login': { token: 'token-1', refresh_token: 'refresh-1', user: USER },
	'/user/me': USER,
	'/role-permissions/me': [],
	'/user-organization': { items: [{ organizationId: 'org-1', isDefault: true }], total: 1 },
	'/timesheet/timer/status': { duration: 0, running: false, lastLog: null }
};
const SERVER_A = 'https://a.example.com/api';
const SERVER_B = 'https://b.example.com/api';

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let requests;
const roots = [];
// The latest sign-in forms of each provider, by its name.
const signIns = {};
// The latest timer and manual time form of each provider, by its name.
const timers = {};
const manualTimes = {};
// The latest team creation and password update forms of each provider, by its name.
const accountForms = {};

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'api-per-provider',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { usePasswordLoginForm } from '${kitSources}/hooks/usePasswordLoginForm.ts';
			export { useTokenSubmission } from '${kitSources}/hooks/useTokenSubmission.ts';
			export { UserNavMenu } from '${kitSources}/components/forms/auth-forms.tsx';
			export { useTimer } from '${kitSources}/hooks/useTimer.ts';
			export { useManualTimeForm } from '${kitSources}/hooks/useManualTimeForm.ts';
			export { useMyTasks } from '${kitSources}/hooks/useMyTasks.ts';
			export { useOrganizationProjects } from '${kitSources}/hooks/useOrganisationProjects.ts';
			export { useEmployeeOrganization } from '${kitSources}/hooks/useEmployeeOrganisation.ts';
			export { useOrganizationTeams } from '${kitSources}/hooks/useOrganizationTeams.ts';
			export { useEmbedProjects } from '${kitSources}/hooks/useEmbedProjects.ts';
			export { useReport } from '${kitSources}/hooks/useReport.ts';
			export { useStatisticsCounts } from '${kitSources}/hooks/useStatisticsCounts.ts';
			export { useTasksStats } from '${kitSources}/hooks/useTasksStats.ts';
			export { useProjectsStats } from '${kitSources}/hooks/useProjectsStats.ts';
			export { useActivitiesStats } from '${kitSources}/hooks/useActivitiesStats.ts';
			export { useTimeLogs } from '${kitSources}/hooks/useTimeLogs.ts';
			export { useMember } from '${kitSources}/hooks/useMember.ts';
			export { useTeamCreationForm } from '${kitSources}/hooks/useTeamCreationForm.ts';
			export { usePasswordUpdateForm } from '${kitSources}/hooks/usePasswordUpdateForm.ts';
			export { apiConfigManager } from '@ever-teams/api';`,
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

beforeEach(() => {
	localStorage.clear();
	requests = [];
	globalThis.fetch = async (url, init) => {
		const { host, pathname } = new URL(url);
		const path = pathname.replace(/^\/api/, '');
		requests.push({ host, path, method: init?.method ?? 'GET' });
		const body = ANSWERS[path] ?? {};
		return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};
});

afterEach(async () => {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
	document.body.replaceChildren();
});

// What the kit's password and token forms do, for the provider they sit in.
function SignIn({ name }) {
	signIns[name] = { password: kit.usePasswordLoginForm({}), token: kit.useTokenSubmission() };
	return null;
}

// A timer widget and a manual time form: the timer reads the status while it is mounted.
function Timer({ name }) {
	timers[name] = kit.useTimer();
	manualTimes[name] = kit.useManualTimeForm();
	return null;
}

const timerOf = (name) => [React.createElement(Timer, { key: 'timer', name })];

// The timer's pickers: tasks, projects, clients and teams, and the projects of a token from the host's getToken.
function Pickers() {
	kit.useMyTasks({ projectId: null });
	kit.useOrganizationProjects({ clientId: null });
	kit.useEmployeeOrganization();
	kit.useOrganizationTeams({ projectId: null });
	kit.useEmbedProjects();
	return null;
}

const pickers = () => [React.createElement(Pickers, { key: 'pickers' })];

// The reports: the weekly report, the counts, the tasks, projects and activities statistics, the time logs and the
// members.
function Reports() {
	kit.useReport();
	kit.useStatisticsCounts();
	kit.useTasksStats();
	kit.useProjectsStats();
	kit.useActivitiesStats();
	kit.useTimeLogs();
	kit.useMember();
	return null;
}

const reports = () => [React.createElement(Reports, { key: 'reports' })];

function AccountForms({ name }) {
	accountForms[name] = { team: kit.useTeamCreationForm(), password: kit.usePasswordUpdateForm() };
	return null;
}

const accountFormsOf = (name) => [React.createElement(AccountForms, { key: 'account', name })];
const typed = (name, value) => ({ target: { name, value } });

// A provider with the sign-in forms and the given widgets; a sign-out keeps the page where it is.
function provider(name, config, widgets = []) {
	const props = { key: name, config, onSignOut() {} };
	return React.createElement(kit.TeamsProvider, props, React.createElement(SignIn, { name }), ...widgets);
}

// The page: one provider per [name, config, widgets], in that order.
async function renderPage(root, providers) {
	const page = providers.map(([name, config, widgets]) => provider(name, config, widgets));
	await act(async () => root.render(React.createElement(React.Fragment, null, page)));
}

async function openPage(providers) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await renderPage(root, providers);
	return { root, container };
}

// Lets the reads that follow a sign-in (permissions, organizations, timer status) run and settle.
async function settle() {
	for (let round = 0; round < 10; round += 1) {
		await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
	}
}

const submitted = { preventDefault() {} };

async function signInOn(name) {
	requests.length = 0;
	await act(async () => signIns[name].password.handleSubmit(submitted));
	await settle();
}

async function signInWithTokenOn(name) {
	requests.length = 0;
	await act(async () => signIns[name].token.handleInputChange({ target: { value: 'pasted-token' } }));
	await act(async () => signIns[name].token.handleSubmit(submitted));
	await settle();
}

const requestsTo = (path) => requests.filter((request) => request.path === path);

const hostOf = (apiUrl) => new URL(apiUrl).host;

test('a sign-in on the first of two providers goes to its own API only, with a password or a token', async () => {
	await openPage([
		['a', { apiUrl: SERVER_A }],
		['b', { apiUrl: SERVER_B }]
	]);

	await signInOn('a');
	assert.deepEqual(requestsTo('/auth/login'), [{ host: hostOf(SERVER_A), path: '/auth/login', method: 'POST' }]);

	await signInWithTokenOn('a');
	assert.deepEqual(requestsTo('/user/me'), [{ host: hostOf(SERVER_A), path: '/user/me', method: 'GET' }]);
});

test('the reads after a sign-in on the first of two providers, and its sign-out, go to its own API only', async () => {
	const menu = React.createElement(kit.UserNavMenu, { key: 'menu' });
	const { container } = await openPage([
		['a', { apiUrl: SERVER_A }, [menu]],
		['b', { apiUrl: SERVER_B }]
	]);

	await signInOn('a');
	assert.equal(requestsTo('/role-permissions/me').length, 1);
	assert.equal(requestsTo('/user-organization').length, 1);

	const buttons = [...container.querySelectorAll('button')];
	const signOut = buttons.find((button) => button.textContent.includes('AUTH.LOGOUT'));
	await act(async () => signOut.click());
	await settle();

	assert.equal(requestsTo('/auth/logout').length, 1);
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set([hostOf(SERVER_A)]));
});

test("with the host's getToken, each of two providers reads the person from its own API", async () => {
	const getToken = async () => ({ token: 'host-token', expiresAt: Date.now() + 60 * 60 * 1000 });
	await openPage([
		['a', { apiUrl: SERVER_A, getToken }],
		['b', { apiUrl: SERVER_B, getToken }]
	]);
	await settle();

	const reads = requestsTo('/user/me').map(({ host }) => host);
	assert.deepEqual(reads.sort(), [hostOf(SERVER_A), hostOf(SERVER_B)]);
});

test('the timer of the second of two providers reads and writes its own API, after the first changed address', async () => {
	const configB = { apiUrl: SERVER_B };
	const { root } = await openPage([
		['a', { apiUrl: SERVER_A }, timerOf('a')],
		['b', configB, timerOf('b')]
	]);
	// The first provider gets another address (an element's api-url changes): the page's address is now that one.
	await renderPage(root, [
		['a', { apiUrl: 'https://a2.example.com/api' }, timerOf('a')],
		['b', configB, timerOf('b')]
	]);
	assert.equal(kit.apiConfigManager.getConfig().apiUrl, 'https://a2.example.com/api');

	await signInOn('b');
	await act(async () => timers.b.startTimer());
	await settle();
	await act(async () => timers.b.stopTimer());
	await settle();
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
	await act(async () => manualTimes.b.setDate(yesterday));
	await act(async () => manualTimes.b.handleTimeChange('start', '09:00'));
	await act(async () => manualTimes.b.handleTimeChange('end', '10:00'));
	await act(async () => manualTimes.b.handleSubmit());
	await settle();

	assert.ok(requestsTo('/timesheet/timer/status').length > 0, 'the status is read');
	assert.equal(requestsTo('/timesheet/timer/start').length, 1);
	assert.equal(requestsTo('/timesheet/timer/stop').length, 1);
	assert.equal(requestsTo('/timesheet/time-slot').length, 1);
	assert.equal(requestsTo('/timesheet/time-log').length, 1);
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set([hostOf(SERVER_B)]));
});

test("the timer's pickers of the second of two providers read its own API, after the first changed address", async () => {
	const configB = { apiUrl: SERVER_B };
	const { root } = await openPage([
		['a', { apiUrl: SERVER_A }, pickers()],
		['b', configB, pickers()]
	]);
	await renderPage(root, [
		['a', { apiUrl: 'https://a2.example.com/api' }, pickers()],
		['b', configB, pickers()]
	]);

	await signInOn('b');

	const read = (start) => requests.filter(({ path }) => path.startsWith(start)).length;
	assert.equal(read('/tasks/employee/'), 1);
	assert.equal(read('/organization-projects/employee/'), 1);
	assert.equal(read('/organization-contact/employee/'), 1);
	assert.equal(read('/organization-team/me'), 1);
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set([hostOf(SERVER_B)]));
});

test("with the host's getToken, the projects and teams of each of two providers come from its own API", async () => {
	const getToken = async () => ({ token: 'host-token', expiresAt: Date.now() + 60 * 60 * 1000 });
	await openPage([
		['a', { apiUrl: SERVER_A, getToken }, pickers()],
		['b', { apiUrl: SERVER_B, getToken }, pickers()]
	]);
	await settle();

	const hostsOf = (path) => requestsTo(path).map(({ host }) => host);
	assert.deepEqual(hostsOf('/embed/projects').sort(), [hostOf(SERVER_A), hostOf(SERVER_B)]);
	assert.deepEqual(hostsOf('/organization-team/me').sort(), [hostOf(SERVER_A), hostOf(SERVER_B)]);
});

test('the reports of the second of two providers read its own API, after the first changed address', async () => {
	const configB = { apiUrl: SERVER_B };
	const { root } = await openPage([
		['a', { apiUrl: SERVER_A }, reports()],
		['b', configB, reports()]
	]);
	await renderPage(root, [
		['a', { apiUrl: 'https://a2.example.com/api' }, reports()],
		['b', configB, reports()]
	]);

	await signInOn('b');

	const read = (start) => requests.filter(({ path }) => path.startsWith(start)).length > 0;
	const paths = [
		'/timesheet/time-log/report/weekly',
		'/timesheet/statistics/counts',
		'/timesheet/statistics/tasks',
		'/timesheet/statistics/projects',
		'/timesheet/statistics/activities',
		'/employee/working'
	];
	assert.deepEqual(paths.filter(read), paths);
	assert.ok(requestsTo('/timesheet/time-log').length > 0, 'the time logs are read');
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set([hostOf(SERVER_B)]));
});

test('a team created and a password changed under the second of two providers go to its own API', async () => {
	const configB = { apiUrl: SERVER_B };
	const { root } = await openPage([
		['a', { apiUrl: SERVER_A }, accountFormsOf('a')],
		['b', configB, accountFormsOf('b')]
	]);
	await renderPage(root, [
		['a', { apiUrl: 'https://a2.example.com/api' }, accountFormsOf('a')],
		['b', configB, accountFormsOf('b')]
	]);
	await signInOn('b');

	await act(async () => accountForms.b.team.handleChange(typed('teamName', 'Design')));
	await act(async () => accountForms.b.team.handleSubmit(submitted));
	for (const [field, value] of [
		['current', 'secret-1'],
		['new', 'secret-2'],
		['confirm', 'secret-2']
	]) {
		await act(async () => accountForms.b.password.handleChange(typed(field, value)));
	}
	await act(async () => accountForms.b.password.handleSubmit(submitted));
	await settle();

	const sent = requests.filter(({ method }) => method !== 'GET').map(({ method, path }) => `${method} ${path}`);
	assert.deepEqual(sent, ['POST /auth/login', 'POST /organization-team', 'POST /auth/login', 'PUT /user/user-1']);
	assert.ok(requestsTo('/organization-team/me').length > 0, 'the teams are read again');
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set([hostOf(SERVER_B)]));
});

test('a provider alone sends to its own API and still sets the address of the page, as before', async () => {
	await openPage([['c', { apiUrl: 'https://c.example.com/api' }]]);

	await signInOn('c');

	assert.equal(kit.apiConfigManager.getConfig().apiUrl, 'https://c.example.com/api');
	assert.ok(requests.length > 0);
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set(['c.example.com']));
});

test('a provider without an apiUrl follows the address the host set with setConfig, as before', async () => {
	kit.apiConfigManager.setConfig({ apiUrl: 'https://host.example.com/api' });
	await openPage([['d', {}]]);

	await signInOn('d');

	assert.ok(requests.length > 0);
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set(['host.example.com']));
});
