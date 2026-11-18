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
		export const getEmbedProjects = async (token, tenantId) => {
			globalThis.__reads.push('embed projects');
			globalThis.__embedProjectsTenant = tenantId;
			return globalThis.__embedProjectsAnswer;
		};`,
	'@ever-teams/toolkit-ui': `
		export const Select = (props) => {
			globalThis.__selects[props.name] = props;
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
// `embedProjects` to the embed projects read. Returns the timer's state as the form leaves it.
async function renderTimerForm({ hostSignIn, embedProjects = [], projectId = null }) {
	globalThis.__hostToken = hostSignIn;
	globalThis.__embedProjectsAnswer = embedProjects;
	globalThis.__reads = [];
	globalThis.__selects = {};
	globalThis.__toasts = [];
	globalThis.__teamsContext = {
		authenticatedUser: { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1' } },
		token: 'token',
		selectedOrganization: 'org-1'
	};
	const timer = {};
	const Form = () => {
		const [state, setState] = React.useState({
			projectId,
			taskId: null,
			organizationTeamId: null,
			clientId: null
		});
		timer.state = state;
		return React.createElement(kit.TeamsTimerForm, { currentTeamsState: state, setCurrentTeamsState: setState });
	};
	root = createRoot(document.createElement('div'));
	const options = { scoped: true, hostSignIn };
	const form = React.createElement(Form);
	await act(async () => root.render(React.createElement(kit.KitOptionsProvider, { value: options }, form)));
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

	await renderTimerForm({ hostSignIn: true, embedProjects: { statusCode: 500, message: 'Internal server error' } });
	assert.equal(globalThis.__selects.project.loading, false);
	assert.equal(globalThis.__selects.project.emptyMessage, 'INPUT.project_select.projects_failed');
	assert.deepEqual(globalThis.__toasts, []);
});

test("with the host's getToken a remembered project the token may not track on is let go once the list is known", async () => {
	const embedProjects = [
		{ id: 'project-1', name: 'Fabrikam site' },
		{ id: 'project-2', name: 'Fabrikam trail app' }
	];

	const elsewhere = await renderTimerForm({ hostSignIn: true, embedProjects, projectId: 'project-9' });
	assert.equal(elsewhere.state.projectId, null, 'a start on it would be refused');
	assert.equal(globalThis.__selects.project.value, '', 'the picker shows its placeholder again');
	await unmountTimerForm();

	const listed = await renderTimerForm({ hostSignIn: true, embedProjects, projectId: 'project-2' });
	assert.equal(listed.state.projectId, 'project-2');
	await unmountTimerForm();

	const olderApi = await renderTimerForm({ hostSignIn: true, embedProjects: [], projectId: 'project-9' });
	assert.equal(olderApi.state.projectId, 'project-9', 'an empty list decides nothing');
	await unmountTimerForm();

	const ordinary = await renderTimerForm({ hostSignIn: false, projectId: 'project-9' });
	assert.equal(ordinary.state.projectId, 'project-9');
});

test("the project picker's words for its loading, empty and failed list exist in both kit locales", () => {
	for (const lang of ['en', 'fr']) {
		const words = require(`${kitSources}/i18n/locales/${lang}.json`).INPUT.project_select;
		for (const key of ['loading_projects', 'no_projects', 'projects_failed']) {
			assert.ok(words[key], `${lang} ${key}`);
		}
	}
});
