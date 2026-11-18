// Each TeamsProvider of a page talks to its own API (ever-co/ever-teams#5483): node --test test/*.test.mjs (from
// packages/toolkit/atoms, after the toolkit-types and api builds).
// bundle-kit.mjs bundles TeamsProvider and the kit's hooks with the built @ever-teams/api, and the UI packages and
// translations replaced by stand-ins; React renders them in jsdom, and a stand-in fetch records every request.
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandIns, recordingFetch } from './kit-stand-ins.mjs';

// The kit's stand-ins with the real sessions provider, whose time-zone helpers (they carry the zone database) stand in.
const standIns = {
	...kitStandIns,
	'@lib/utils/time-zone':
		'export const getUserTimezone = () => "UTC"; export const convertSessionDatesToTimezone = (session) => session;'
};
delete standIns['@lib/context/teams-tracking-context'];
// Every toast the kit shows, in order: an answer of a provider's previous address shows none.
const toasts = [];
globalThis.kitToasts = toasts;
const silentToast = 'export const toast = () => {};';
standIns['@ever-teams/toolkit-ui'] = kitStandIns['@ever-teams/toolkit-ui'].replace(
	silentToast,
	'export const toast = (shown) => { globalThis.kitToasts.push(shown); };'
);
const standInOf = (importPath) => Object.keys(standIns).find((name) => importPath === name);

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
	assert.ok(kitStandIns['@ever-teams/toolkit-ui'].includes(silentToast), 'the toasts are recorded');
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
			export { useTeamsContext } from '${kitSources}/context/teams-context.ts';
			export { useTrackingContext } from '${kitSources}/context/teams-tracking-context.tsx';
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
	toasts.length = 0;
	requests = [];
	globalThis.fetch = recordingFetch(requests);
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

// The stand-in API with the answers a test names by host and path: a held one waits until the test lets it go. Each
// request also records the Authorization header it carried, by host.
function answering(named) {
	const standard = recordingFetch(requests);
	const waiting = [];
	const sent = [];
	globalThis.fetch = async (url, init) => {
		const { host, pathname } = new URL(url);
		const path = pathname.replace(/^\/api/, '');
		sent.push({ host, authorization: new Headers(init?.headers).get('authorization') });
		const answer = await standard(url, init);
		const own = named.find((entry) => entry.host === host && entry.path === path);
		if (!own) {
			return answer;
		}
		if (own.held) {
			await new Promise((resolve) => waiting.push(resolve));
		}
		if (own.body === undefined) {
			return answer;
		}
		return Response.json(own.body);
	};
	const release = () => {
		for (const letGo of waiting.splice(0)) {
			letGo();
		}
	};
	const tokensSentTo = (server) =>
		sent
			.filter(({ host, authorization }) => host === hostOf(server) && authorization)
			.map(({ authorization }) => authorization.replace(/^Bearer /, ''));
	return { release, tokensSentTo };
}

// What each provider holds, by its name: its token, the person it shows and the time logs a widget reads.
const holdings = {};

function Holdings({ name }) {
	const { token, authenticatedUser } = kit.useTeamsContext();
	const timeLogs = kit.useTimeLogs();
	holdings[name] = { token, userId: authenticatedUser?.id ?? null, timeLogs: timeLogs.data };
	return null;
}

const holdingsOf = (name) => [React.createElement(Holdings, { key: 'holdings', name })];

// The host's getToken on a server: its backend gets a token of that server.
const hostSignInOn = (server) => ({
	apiUrl: server,
	getToken: async () => ({ token: `${hostOf(server)}-token`, expiresAt: Date.now() + 60 * 60 * 1000 })
});

test('a sign-in that answers once its provider moved to another address leaves no session there', async () => {
	const api = answering([{ host: hostOf(SERVER_A), path: '/auth/login', held: true }]);
	const { root } = await openPage([['a', { apiUrl: SERVER_A }, holdingsOf('a')]]);
	let signingIn;
	await act(async () => {
		signingIn = signIns.a.password.handleSubmit(submitted);
	});

	await renderPage(root, [['a', { apiUrl: SERVER_B }, holdingsOf('a')]]);
	await act(async () => {
		api.release();
		await signingIn;
	});
	await settle();

	assert.deepEqual(holdings.a, { token: '', userId: null, timeLogs: null });
	assert.equal(localStorage.getItem('_teams-store'), null, 'no session is saved for the page');
	assert.deepEqual(api.tokensSentTo(SERVER_B), [], "A's token never reaches B");
});

test('a timer start and a read that answer once their provider moved to another address show nothing there', async () => {
	const api = answering([
		{ host: hostOf(SERVER_A), path: '/timesheet/timer/start', held: true },
		{ host: hostOf(SERVER_A), path: '/timesheet/time-log', held: true, body: [{ id: 'log-of-a' }] },
		{ host: hostOf(SERVER_B), path: '/timesheet/time-log', body: [{ id: 'log-of-b' }] }
	]);
	const widgets = () => [...timerOf('a'), ...holdingsOf('a')];
	const { root } = await openPage([['a', hostSignInOn(SERVER_A), widgets()]]);
	await settle();
	let starting;
	await act(async () => {
		starting = timers.a.startTimer();
	});

	await renderPage(root, [['a', hostSignInOn(SERVER_B), widgets()]]);
	await settle();
	const sentBeforeRelease = requests.length;
	await act(async () => {
		api.release();
		await starting;
	});
	await settle();

	assert.equal(timers.a.isRunning, false, "A's start does not run B's timer");
	const readsOfA = requests
		.slice(sentBeforeRelease)
		.filter(({ host, path }) => host === hostOf(SERVER_A) && path === '/timesheet/timer/status');
	assert.deepEqual(readsOfA, [], "A's start reads no status from A for the provider that left it");
	assert.deepEqual(holdings.a.timeLogs, [{ id: 'log-of-b' }]);
	assert.ok(api.tokensSentTo(SERVER_B).length > 0, 'B is read');
	assert.deepEqual(new Set(api.tokensSentTo(SERVER_B)), new Set([`${hostOf(SERVER_B)}-token`]));
});

// The sessions each provider shows, by its name: they are read while a component shows them.
const shownSessions = {};

function Sessions({ name }) {
	shownSessions[name] = kit.useTrackingContext().sessions;
	return null;
}

const sessionsOf = (name) => [React.createElement(Sessions, { key: 'sessions', name })];

test('a provider without an apiUrl reads its sessions from the address the page holds when it reads them', async () => {
	const sessions = sessionsOf('d');
	await openPage([
		['a', { apiUrl: SERVER_A }],
		['d', {}, sessions]
	]);
	// The host moves the page to another server once the first provider has set its own address: the provider without
	// one renders again for it.
	await act(async () => kit.apiConfigManager.setConfig({ apiUrl: 'https://host.example.com/api' }));

	await signInOn('d');

	const reads = requestsTo('/timesheet/custom-tracking/sessions').map(({ host }) => host);
	assert.deepEqual(reads, ['host.example.com']);
});

test('sessions read on the previous address of a provider never show once it has another', async () => {
	const answerWith = (id) => ({ success: true, data: { sessions: [{ id }] } });
	const sessionsPath = '/timesheet/custom-tracking/sessions';
	const api = answering([
		{ host: hostOf(SERVER_A), path: sessionsPath, held: true, body: answerWith('session-of-a') },
		{ host: hostOf(SERVER_B), path: sessionsPath, body: answerWith('session-of-b') }
	]);
	const { root } = await openPage([['a', hostSignInOn(SERVER_A), sessionsOf('a')]]);
	await settle();

	await renderPage(root, [['a', hostSignInOn(SERVER_B), sessionsOf('a')]]);
	await settle();
	await act(async () => api.release());
	await settle();

	assert.deepEqual(shownSessions.a, [{ id: 'session-of-b' }]);
	assert.deepEqual(new Set(api.tokensSentTo(SERVER_B)), new Set([`${hostOf(SERVER_B)}-token`]));
});

test('reads that fail once their provider moved to another address show no error there', async () => {
	// After the sign-in on A, every read of the pickers and the reports waits, then A refuses it.
	const answeredAtOnce = ['/auth/login', '/user/me', '/role-permissions/me', '/user-organization'];
	const standard = recordingFetch(requests);
	const waiting = [];
	globalThis.fetch = async (url, init) => {
		const answer = await standard(url, init);
		const { host, pathname } = new URL(url);
		const path = pathname.replace(/^\/api/, '');
		if (host !== hostOf(SERVER_A) || answeredAtOnce.includes(path)) {
			return answer;
		}
		await new Promise((resolve) => waiting.push(resolve));
		return Response.json({ message: `refused by ${host}` }, { status: 403 });
	};
	const widgets = () => [...pickers(), ...reports()];
	const { root } = await openPage([['a', { apiUrl: SERVER_A }, widgets()]]);
	await signInOn('a');
	assert.ok(waiting.length > 0, 'the reads wait for A');

	// The session saved on the page would follow the provider to B (ever-co/ever-teams#5524): B starts signed out.
	localStorage.clear();
	await renderPage(root, [['a', { apiUrl: SERVER_B }, widgets()]]);
	await act(async () => {
		for (const letGo of waiting.splice(0)) {
			letGo();
		}
	});
	await settle();

	const refusalsOfA = toasts.filter(({ description }) => String(description).includes(hostOf(SERVER_A)));
	assert.deepEqual(refusalsOfA, [], "A's refusals show no toast once the provider is on B");
});

test('a read of the person that answers once its provider moved to another address saves no session', async () => {
	const userOfA = { id: 'user-of-a', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'org-1' } };
	const api = answering([{ host: hostOf(SERVER_A), path: '/user/me', held: true, body: userOfA }]);
	// The session a sign-in on A saved: the provider reads the person with its token, and A answers late.
	const saved = { app: { user: null }, persist: { token: 'token-1', expiry: Date.now() + 60 * 60 * 1000 } };
	localStorage.setItem('_teams-store', JSON.stringify(saved));
	const { root } = await openPage([['a', { apiUrl: SERVER_A }, holdingsOf('a')]]);
	await settle();
	assert.deepEqual(requestsTo('/user/me'), [{ host: hostOf(SERVER_A), path: '/user/me', method: 'GET' }]);

	// The saved session would follow the provider to B (ever-co/ever-teams#5524): B starts signed out.
	localStorage.clear();
	await renderPage(root, [['a', { apiUrl: SERVER_B }, holdingsOf('a')]]);
	await act(async () => api.release());
	await settle();

	assert.equal(localStorage.getItem('_teams-store'), null, "A's answer saves no session for the page");
	assert.deepEqual(holdings.a, { token: '', userId: null, timeLogs: null });
});

test("a provider without an apiUrl starts afresh when the page's address changes under it", async () => {
	const api = answering([]);
	await act(async () => kit.apiConfigManager.setConfig({ apiUrl: SERVER_A }));
	const { root } = await openPage([['d', {}, holdingsOf('d')]]);
	await signInOn('d');
	assert.equal(holdings.d.token, 'token-1', 'signed in on A');
	assert.deepEqual(new Set(requests.map(({ host }) => host)), new Set([hostOf(SERVER_A)]));

	// The saved session would follow the provider to B (ever-co/ever-teams#5524): B starts signed out.
	localStorage.clear();
	// Another provider of the page points at B, which becomes the page's address.
	await renderPage(root, [
		['d', {}, holdingsOf('d')],
		['b', { apiUrl: SERVER_B }]
	]);
	await settle();

	assert.equal(kit.apiConfigManager.getConfig().apiUrl, SERVER_B);
	assert.deepEqual(holdings.d, { token: '', userId: null, timeLogs: null }, 'nothing read on A stays');
	assert.deepEqual(api.tokensSentTo(SERVER_B), [], "A's token never reaches B");
});

test("a stop that answers once the page's address changed records its time on the server that stopped", async () => {
	const api = answering([{ host: hostOf(SERVER_A), path: '/timesheet/timer/stop', held: true }]);
	await act(async () => kit.apiConfigManager.setConfig({ apiUrl: SERVER_A }));
	const { root } = await openPage([['d', {}, timerOf('d')]]);
	await signInOn('d');
	let stopping;
	await act(async () => {
		stopping = timers.d.stopTimer();
	});

	localStorage.clear();
	await renderPage(root, [
		['d', {}, timerOf('d')],
		['b', { apiUrl: SERVER_B }]
	]);
	await settle();
	await act(async () => {
		api.release();
		await stopping;
	});
	await settle();

	const slots = requestsTo('/timesheet/time-slot').map(({ host }) => host);
	assert.deepEqual(slots, [hostOf(SERVER_A)]);
	assert.deepEqual(api.tokensSentTo(SERVER_B), [], "A's token never reaches B");
});

test('time logs that answer once the person signed out show nothing', async () => {
	const api = answering([{ host: hostOf(SERVER_A), path: '/timesheet/time-log', held: true, body: [{ id: 'log' }] }]);
	const menu = React.createElement(kit.UserNavMenu, { key: 'menu' });
	const { container } = await openPage([['a', { apiUrl: SERVER_A }, [menu, ...holdingsOf('a')]]]);
	await signInOn('a');
	assert.ok(requestsTo('/timesheet/time-log').length > 0, 'the time logs are read');

	const buttons = [...container.querySelectorAll('button')];
	const signOut = buttons.find((button) => button.textContent.includes('AUTH.LOGOUT'));
	await act(async () => signOut.click());
	await settle();
	await act(async () => api.release());
	await settle();

	assert.deepEqual(holdings.a, { token: '', userId: null, timeLogs: null });
});
