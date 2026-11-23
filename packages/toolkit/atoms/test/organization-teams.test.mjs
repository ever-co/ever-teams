// The timer's teams read follows the sign-in mode: node --test test/*.test.mjs (from packages/toolkit/atoms).
// bundle-kit.mjs bundles useOrganizationTeams with the API's teams read replaced by one that records what it is asked,
// and the teams context by a signed-in person; React renders it in jsdom.
import { test, before, after } from 'node:test';
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
	'@ever-teams/api': `export const getOrganisationTeams = async (options) => {
			globalThis.__teamsReads.push(options);
			return globalThis.__teamsAnswer ? globalThis.__teamsAnswer(options) : { items: [], total: 0 };
		};`,
	'@ever-teams/toolkit-ui': 'export const toast = (message) => globalThis.__toasts?.push(message);',
	'@lib/context/teams-context': `export const useTeamsContext = () => globalThis.__teamsContext;`
};
// The stand-in an import names: the alias has already turned an `@lib/...` import into a path ending the same way.
const standInOf = (importPath) =>
	Object.keys(standIns).find((name) => {
		const isLibModule = name.startsWith('@lib/');
		return importPath === name || (isLibModule && importPath.endsWith(name.slice('@lib'.length)));
	});

let React;
let act;
let createRoot;
let kit;
let removeBundle;

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'organization-teams',
		entry: `export { useOrganizationTeams } from '${kitSources}/hooks/useOrganizationTeams.ts';
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

after(() => {
	removeBundle?.();
});

// What the timer's teams read asks while the timer's project goes through `projects`, in a provider with or without
// the host's getToken
async function teamsReads({ hostSignIn, projects = [null] }) {
	globalThis.__teamsReads = [];
	globalThis.__teamsContext = {
		authenticatedUser: { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1' } },
		token: 'token',
		selectedOrganization: 'org-1'
	};
	const Teams = ({ projectId }) => {
		kit.useOrganizationTeams({ projectId });
		return null;
	};
	const root = createRoot(document.createElement('div'));
	const options = { scoped: true, hostSignIn };
	for (const projectId of projects) {
		const timer = React.createElement(Teams, { projectId });
		await act(async () => root.render(React.createElement(kit.KitOptionsProvider, { value: options }, timer)));
	}
	await act(async () => root.unmount());
	return globalThis.__teamsReads;
}

test("with the host's getToken the teams read is the embedded one, which the API's embed guard accepts", async () => {
	const reads = await teamsReads({ hostSignIn: true });

	assert.equal(reads.length, 1);
	assert.equal(reads[0].embedded, true);
});

test('without getToken the teams read is the full one, as before', async () => {
	const reads = await teamsReads({ hostSignIn: false });

	assert.equal(reads.length, 1);
	assert.notEqual(reads[0].embedded, true);
});

test("with the host's getToken another project does not read the same teams again", async () => {
	const reads = await teamsReads({ hostSignIn: true, projects: ['project-1', 'project-2'] });

	assert.equal(reads.length, 1);
	assert.equal(reads[0].projectId, null);
});

test('without getToken another project reads its teams, as before', async () => {
	const reads = await teamsReads({ hostSignIn: false, projects: ['project-1', 'project-2'] });

	assert.deepEqual(
		reads.map((read) => read.projectId),
		['project-1', 'project-2']
	);
});

test('a read the timer has moved past does not replace the current one when it answers last', async () => {
	globalThis.__teamsReads = [];
	globalThis.__toasts = [];
	globalThis.__teamsContext = {
		authenticatedUser: { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1' } },
		token: 'token',
		selectedOrganization: 'org-1'
	};
	const answers = new Map();
	globalThis.__teamsAnswer = (options) =>
		new Promise((resolve) => {
			answers.set(options.projectId, resolve);
		});
	let shown;
	const Teams = ({ projectId }) => {
		shown = kit.useOrganizationTeams({ projectId });
		return null;
	};
	const root = createRoot(document.createElement('div'));
	const options = { scoped: true, hostSignIn: false };
	const render = (projectId) =>
		act(async () =>
			root.render(
				React.createElement(
					kit.KitOptionsProvider,
					{ value: options },
					React.createElement(Teams, { projectId })
				)
			)
		);
	try {
		await render('project-1');
		await render('project-2');
		await act(async () => answers.get('project-2')({ items: [{ id: 'team-2' }], total: 1 }));
		await act(async () => answers.get('project-1')({ error: 'the earlier read failed' }));

		assert.deepEqual(shown, { data: { items: [{ id: 'team-2' }], total: 1 }, loading: false });
		assert.deepEqual(globalThis.__toasts, []);
	} finally {
		globalThis.__teamsAnswer = undefined;
		await act(async () => root.unmount());
	}
});
