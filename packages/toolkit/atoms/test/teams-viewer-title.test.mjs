// The team viewer's title names the selected organization only when it is known (ever-co/ever-teams#5644):
// node --test test/*.test.mjs (from packages/toolkit/atoms). bundle-kit.mjs bundles TeamsTeamsViewer with its teams
// hook, the kit's context and the toolkit-ui parts as stand-ins, and the kit's English strings; React renders it to
// static markup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { englishTranslation } from './kit-stand-ins.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const children = '({ children }) => children ?? null';
const nothing = '() => null';
const standIns = {
	'@ever-teams/toolkit-ui': `export const cn = (...names) => names.filter(Boolean).join(' ');
		export const Avatar = ${nothing};
		export const Badge = ${children};
		export const Button = ${children};
		export const Input = ${nothing};
		export const Select = ${nothing};
		export const Table = ${children};
		export const TableHeader = ${children};
		export const TableBody = ${children};
		export const TableRow = ${children};
		export const TableHead = ${children};
		export const TableCell = ${children};`,
	'@ever-teams/toolkit-types': "export const RoleName = { MANAGER: 'MANAGER' };",
	'react-i18next': englishTranslation,
	'lucide-react': `export const ChevronLeft = ${nothing};
		export const ChevronRight = ${nothing};
		export const LoaderCircle = ${nothing};`,
	teams: 'export const useOrganizationTeams = () => ({ data: { items: [] }, loading: false });',
	context: `export const useTeamsContext = () => ({
		selectedTeam: '',
		userOrganizations: globalThis.viewerOrganizations ?? null,
		selectedOrganization: 'org-1'
	});`,
	parts: `export const TeamsTimerFooter = ${nothing};
		export const TeamsTeamCreationFormDialog = ${nothing};`
};
const BY_PATH = [
	['hooks/useOrganizationTeams', 'teams'],
	['context/teams-context', 'context'],
	['component-footer', 'parts'],
	['team-creation-form', 'parts']
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
		name: 'teams-viewer-title',
		entry: `export { TeamsTeamsViewer } from '${kitSources}/components/teams-team/teams-teams-viewer.tsx';`,
		standIns,
		standInOf,
		external: ['react-dom/server']
	});
	kit = bundle.bundled;
	removeBundle = bundle.remove;
});

after(() => removeBundle?.());

function titleWith(organizations) {
	globalThis.viewerOrganizations = organizations;
	try {
		const { createElement } = require('react');
		const { renderToStaticMarkup } = require('react-dom/server');
		const markup = renderToStaticMarkup(createElement(kit.TeamsTeamsViewer));
		return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document.querySelector('h2').textContent;
	} finally {
		globalThis.viewerOrganizations = undefined;
	}
}

test('signed out, or before the organizations are read, the title names no organization', () => {
	assert.equal(titleWith(null), 'Teams');
	assert.equal(titleWith({ items: [] }), 'Teams');
	assert.equal(titleWith({ items: [{ organizationId: 'org-1', organization: { name: '' } }] }), 'Teams');
});

test('once the selected organization is known, the title names it', () => {
	const organizations = { items: [{ organizationId: 'org-1', organization: { name: 'Northwind Studio' } }] };

	assert.equal(titleWith(organizations), 'Teams for Northwind Studio');
});
