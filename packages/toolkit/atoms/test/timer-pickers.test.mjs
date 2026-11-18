// What the timer's pickers read and show, with and without the host's getToken: node --test test/*.test.mjs (from
// packages/toolkit/atoms). bundle-kit.mjs bundles the timer form with the API's reads replaced by ones that record what
// they are asked, the selects by ones that keep their props, and the teams context by a signed-in person; React renders
// it in jsdom.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const standIns = {
	'@ever-teams/api': `
		// A token from getToken reaches the teams, and the API's embed guard refuses the other reads
		const refusal = { statusCode: 403, code: 'EMBED_SCOPE', message: 'An embed token reaches only the timer.' };
		const recorded = (name, answer) => async () => {
			globalThis.__reads.push(name);
			const refused = globalThis.__hostToken && name !== 'teams';
			if (refused) {
				return refusal;
			}
			return answer();
		};
		export const getOrganizationClients = recorded('clients', () => [{ id: 'client-1', name: 'Fabrikam Outdoor' }]);
		export const getOrganisationProjects = recorded('projects', () => [{ id: 'project-9', name: 'Internal tools' }]);
		export const getOrganisationTeams = recorded('teams', () => ({ items: [{ id: 'team-1', name: 'Trails' }] }));
		export const getMyTasks = recorded('tasks', () => [{ id: 'task-1', title: 'Map the north loop' }]);
		// The answer, or the function that answers each token
		export const getEmbedProjects = async (token, tenantId) => {
			globalThis.__reads.push('embed projects');
			globalThis.__embedProjectsTenant = tenantId;
			globalThis.__embedProjectsTokens.push(token);
			const answer = globalThis.__embedProjectsAnswer;
			return typeof answer === 'function' ? answer(token) : answer;
		};`,
	'@ever-teams/toolkit-ui': `
		import { useEffect } from 'react';
		export const Select = (props) => {
			globalThis.__selects[props.name] = props;
			(globalThis.__selectRenders[props.name] ??= []).push(props);
			useEffect(() => {
				globalThis.__selectMounts[props.name] = (globalThis.__selectMounts[props.name] ?? 0) + 1;
			}, []);
			return null;
		};
		export const Tooltip = ({ children }) => children;
		export const toast = (notice) => {
			globalThis.__toasts.push(notice);
		};`,
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });',
	'/context/teams-context': 'export const useTeamsContext = () => globalThis.__teamsContext;'
};
// The aliases have already turned `@lib/context/teams-context` into a path that ends the same way.
const standInOf = (importPath) => Object.keys(standIns).find((name) => importPath.endsWith(name));

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let root;

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'timer-pickers',
		entry: `export { TeamsTimerForm } from '${kitSources}/components/forms/teams-timer-form.tsx';
			export { KitOptionsProvider } from '${kitSources}/components/teams-provider/kit-options.ts';`,
		standIns,
		standInOf
	});
	kit = bundled;
	removeBundle = remove;
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
});

async function unmountTimerForm() {
	await act(async () => root?.unmount());
	root = undefined;
}

afterEach(unmountTimerForm);

after(() => {
	removeBundle?.();
});

// The timer form of a signed-in person, in a provider with or without the host's getToken, on an API that answers
// `embedProjects` to the embed projects read (or `embedProjects(token)` when it is a function). Returns the timer's state
// as the form leaves it, and `rerender(teamsContext)` to render it again for another token or session.
async function renderTimerForm({ hostSignIn, embedProjects = [], projectId = null, taskId = null, clientId = null }) {
	globalThis.__hostToken = hostSignIn;
	globalThis.__embedProjectsAnswer = embedProjects;
	globalThis.__embedProjectsTokens = [];
	globalThis.__reads = [];
	globalThis.__selects = {};
	globalThis.__selectMounts = {};
	globalThis.__selectRenders = {};
	globalThis.__toasts = [];
	const timer = {};
	const Form = () => {
		const [state, setState] = React.useState({
			projectId,
			taskId,
			organizationTeamId: null,
			clientId
		});
		timer.state = state;
		return React.createElement(kit.TeamsTimerForm, { currentTeamsState: state, setCurrentTeamsState: setState });
	};
	root = createRoot(document.createElement('div'));
	const options = { scoped: true, hostSignIn };
	timer.rerender = async (teamsContext) => {
		globalThis.__teamsContext = teamsContext;
		const form = React.createElement(Form);
		await act(async () => root.render(React.createElement(kit.KitOptionsProvider, { value: options }, form)));
	};
	await timer.rerender({
		authenticatedUser: { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1' } },
		token: 'token',
		selectedOrganization: 'org-1'
	});
	return timer;
}

const labelsOf = (select) => select.values?.map((item) => item.label);

test("with the host's getToken the client, task and member's projects reads are not made, and no refusal shows", async () => {
	await renderTimerForm({ hostSignIn: true });

	assert.deepEqual([...globalThis.__reads].sort(), ['embed projects', 'teams']);
	assert.deepEqual(globalThis.__toasts, []);
	for (const name of ['client', 'task']) {
		assert.equal(labelsOf(globalThis.__selects[name]), undefined, name);
		assert.equal(globalThis.__selects[name].loading, false, name);
	}
});

test('without getToken the pickers read the clients, projects, teams and tasks, as before', async () => {
	await renderTimerForm({ hostSignIn: false });

	assert.deepEqual([...globalThis.__reads].sort(), ['clients', 'projects', 'tasks', 'teams']);
	assert.deepEqual(labelsOf(globalThis.__selects.client), ['Fabrikam Outdoor']);
	assert.deepEqual(labelsOf(globalThis.__selects.project), ['Internal tools']);
	assert.deepEqual(labelsOf(globalThis.__selects.task), ['Map the north loop']);
	assert.equal(globalThis.__selects.project.emptyMessage, undefined);
});

test("with the host's getToken the project picker lists the embed projects, and the one picked is the timer's project", async () => {
	const embedProjects = [
		{ id: 'project-1', name: 'Fabrikam site' },
		{ id: 'project-2', name: 'Fabrikam trail app' }
	];
	const timer = await renderTimerForm({ hostSignIn: true, embedProjects });

	assert.deepEqual(labelsOf(globalThis.__selects.project), ['Fabrikam site', 'Fabrikam trail app']);
	assert.equal(globalThis.__selects.project.loading, false);
	assert.equal(globalThis.__embedProjectsTenant, 'tenant-1', 'the tenant goes with the read, as the API requires');

	await act(async () => globalThis.__selects.project.onValueChange('project-2'));

	assert.equal(timer.state.projectId, 'project-2');
});

test("with the host's getToken an API without the embed projects route leaves the project picker empty, with no notice", async () => {
	const olderApis = [
		{ statusCode: 404, message: 'Cannot GET /api/embed/projects', error: 'Not Found' },
		{ statusCode: 403, code: 'EMBED_SCOPE', message: 'An embed token reaches only the timer.' }
	];
	for (const answer of olderApis) {
		await renderTimerForm({ hostSignIn: true, embedProjects: answer });

		assert.equal(labelsOf(globalThis.__selects.project), undefined);
		assert.equal(globalThis.__selects.project.emptyMessage, 'INPUT.project_select.no_projects');
		assert.deepEqual(globalThis.__toasts, []);
		await unmountTimerForm();
	}
});

test("with the host's getToken the project picker says while its projects are read, and when they could not be", async () => {
	await renderTimerForm({ hostSignIn: true, embedProjects: new Promise(() => {}) });
	assert.equal(globalThis.__selects.project.loading, true);
	assert.equal(globalThis.__selects.project.emptyMessage, 'INPUT.project_select.loading_projects');
	await unmountTimerForm();

	const refusals = [
		{ statusCode: 500, message: 'Internal server error' },
		{ statusCode: 403, code: 'EMBED_TOKEN_REQUIRED', message: 'This route answers an embed token only.' },
		{ statusCode: 403, message: 'Forbidden resource' },
		{ statusCode: 401, message: 'Unauthorized' },
		{ message: 'Failed to fetch' }
	];
	for (const answer of refusals) {
		const timer = await renderTimerForm({ hostSignIn: true, embedProjects: answer, projectId: 'project-9' });
		const reason = JSON.stringify(answer);
		assert.equal(globalThis.__selects.project.loading, false, reason);
		assert.equal(globalThis.__selects.project.emptyMessage, 'INPUT.project_select.projects_failed', reason);
		assert.equal(timer.state.projectId, 'project-9', `a failed read decides nothing: ${reason}`);
		assert.deepEqual(globalThis.__toasts, [], reason);
		await unmountTimerForm();
	}
});

test("with the host's getToken a remembered project the token may not track on is let go once the list is known", async () => {
	const embedProjects = [
		{ id: 'project-1', name: 'Fabrikam site' },
		{ id: 'project-2', name: 'Fabrikam trail app' }
	];
	const remembered = { projectId: 'project-9', taskId: 'task-9', clientId: 'client-9' };

	const elsewhere = await renderTimerForm({ hostSignIn: true, embedProjects, ...remembered });
	assert.equal(elsewhere.state.projectId, null, 'a start on it would be refused');
	assert.equal(elsewhere.state.taskId, null, 'its task goes with it: the task picker lists none to change it');
	assert.equal(elsewhere.state.clientId, null, 'and so does its client');
	assert.equal(globalThis.__selects.project.value, '', 'the picker shows its placeholder again');
	assert.equal(globalThis.__selectMounts.project, 2, 'a new select, whose placeholder shows on every Radix version');
	await unmountTimerForm();

	const listed = await renderTimerForm({ hostSignIn: true, embedProjects, ...remembered, projectId: 'project-2' });
	assert.deepEqual([listed.state.projectId, listed.state.taskId], ['project-2', 'task-9']);
	assert.equal(globalThis.__selectMounts.project, 1);
	await unmountTimerForm();

	const none = await renderTimerForm({ hostSignIn: true, embedProjects: [], ...remembered });
	assert.equal(none.state.projectId, null, 'an empty list is an answer too: the token may track time on no project');
	await unmountTimerForm();

	const olderApi = { statusCode: 404, message: 'Cannot GET /api/embed/projects', error: 'Not Found' };
	const unknown = await renderTimerForm({ hostSignIn: true, embedProjects: olderApi, ...remembered });
	assert.deepEqual(
		unknown.state,
		{ ...remembered, organizationTeamId: null },
		'an API without the route decides nothing'
	);
	await unmountTimerForm();

	const ordinary = await renderTimerForm({ hostSignIn: false, ...remembered });
	assert.equal(ordinary.state.projectId, 'project-9');
});

test("with the host's getToken another project picked lets the remembered task and client go; without it they stay", async () => {
	const embedProjects = [
		{ id: 'project-1', name: 'Fabrikam site' },
		{ id: 'project-2', name: 'Fabrikam trail app' }
	];
	const remembered = { projectId: 'project-1', taskId: 'task-1', clientId: 'client-1' };

	const host = await renderTimerForm({ hostSignIn: true, embedProjects, ...remembered });
	await act(async () => globalThis.__selects.project.onValueChange('project-1'));
	assert.deepEqual([host.state.taskId, host.state.clientId], ['task-1', 'client-1'], 'the same project keeps them');
	await act(async () => globalThis.__selects.project.onValueChange('project-2'));
	assert.deepEqual([host.state.projectId, host.state.taskId, host.state.clientId], ['project-2', null, null]);
	await unmountTimerForm();

	const ordinary = await renderTimerForm({ hostSignIn: false, ...remembered });
	await act(async () => globalThis.__selects.project.onValueChange('project-9'));
	const { projectId, taskId, clientId } = ordinary.state;
	assert.deepEqual([projectId, taskId, clientId], ['project-9', 'task-1', 'client-1']);
});

test("with the host's getToken a failed read is made again with the next token, and a list read stays through renewals", async () => {
	const listed = [{ id: 'project-1', name: 'Fabrikam site' }];
	const expired = { statusCode: 401, message: 'Unauthorized' };
	const timer = await renderTimerForm({
		hostSignIn: true,
		embedProjects: (token) => (token === 'token' ? expired : listed)
	});
	assert.equal(globalThis.__selects.project.emptyMessage, 'INPUT.project_select.projects_failed');
	const session = globalThis.__teamsContext;

	await timer.rerender({ ...session, token: 'renewed-token' });
	assert.deepEqual(labelsOf(globalThis.__selects.project), ['Fabrikam site']);

	await timer.rerender({ ...session, token: 'token-3' });
	assert.deepEqual(globalThis.__embedProjectsTokens, ['token', 'renewed-token'], 'a renewal keeps the list read');
	assert.deepEqual(labelsOf(globalThis.__selects.project), ['Fabrikam site']);
});

test("with the host's getToken a read still running when the token is renewed is made again with the new one", async () => {
	const listed = [{ id: 'project-1', name: 'Fabrikam site' }];
	let answerTheExpiredToken;
	const timer = await renderTimerForm({
		hostSignIn: true,
		embedProjects: (token) => {
			if (token !== 'token') {
				return listed;
			}
			return new Promise((resolve) => {
				answerTheExpiredToken = () => resolve({ statusCode: 401, message: 'Unauthorized' });
			});
		}
	});

	await timer.rerender({ ...globalThis.__teamsContext, token: 'renewed-token' });
	await act(async () => answerTheExpiredToken());

	assert.deepEqual(globalThis.__embedProjectsTokens, ['token', 'renewed-token']);
	assert.deepEqual(labelsOf(globalThis.__selects.project), ['Fabrikam site']);
	assert.notEqual(globalThis.__selects.project.emptyMessage, 'INPUT.project_select.projects_failed');
});

test("with the host's getToken the projects read are not listed once the host signs the person out", async () => {
	const timer = await renderTimerForm({
		hostSignIn: true,
		embedProjects: [{ id: 'project-1', name: 'Fabrikam site' }]
	});
	assert.deepEqual(labelsOf(globalThis.__selects.project), ['Fabrikam site']);

	await timer.rerender({ authenticatedUser: null, token: '', selectedOrganization: '' });

	assert.equal(labelsOf(globalThis.__selects.project), undefined);
	assert.equal(globalThis.__selects.project.loading, false);
});

test("with the host's getToken the same person signed in again starts from a new read, not from the list read before", async () => {
	const timer = await renderTimerForm({
		hostSignIn: true,
		embedProjects: [{ id: 'project-1', name: 'Fabrikam site' }]
	});
	const session = globalThis.__teamsContext;
	await timer.rerender({ authenticatedUser: null, token: '', selectedOrganization: '' });
	await act(async () => globalThis.__selects.project.onValueChange('project-9'));
	globalThis.__embedProjectsAnswer = new Promise(() => {});
	const rendersBefore = globalThis.__selectRenders.project.length;

	await timer.rerender({ ...session, token: 'token-2' });

	const rendersAfter = globalThis.__selectRenders.project.slice(rendersBefore);
	assert.ok(rendersAfter.length > 0);
	assert.deepEqual(
		rendersAfter.map(labelsOf),
		rendersAfter.map(() => undefined),
		'no render shows the earlier list'
	);
	assert.equal(globalThis.__selects.project.loading, true);
	assert.equal(timer.state.projectId, 'project-9', 'the earlier list does not let the project go');
});

test("the project picker's words for its loading, empty and failed list exist in both kit locales", () => {
	for (const lang of ['en', 'fr']) {
		const words = require(`${kitSources}/i18n/locales/${lang}.json`).INPUT.project_select;
		for (const key of ['loading_projects', 'no_projects', 'projects_failed']) {
			assert.ok(words[key], `${lang} ${key}`);
		}
	}
});
