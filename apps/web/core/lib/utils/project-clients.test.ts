import type { TOrganizationProject } from '@/core/types/schemas';
import { buildProjectRequest, draftFromProject, emptyProjectDraft } from './project-composer';
import {
	NO_CLIENT_FILTER_VALUE,
	PROJECT_COLUMNS,
	PROJECT_FILTER_FIELDS,
	clientIdOf,
	clientNameOf,
	countActiveFilterValues,
	projectMatchesFilters,
	readProjectFilters,
	type ProjectFilters
} from './project-list';

function projectOf(fields: Partial<TOrganizationProject>): TOrganizationProject {
	return { id: 'p1', name: 'Website', public: null, owner: null, code: null, ...fields } as TOrganizationProject;
}

function filtersOf(clients: string[]): ProjectFilters {
	return { teams: [], clients, members: [], managers: [], status: [], budgetTypes: [] };
}

const withAcme = projectOf({ organizationContactId: 'c1', organizationContact: { id: 'c1', name: 'Acme' } });
const withArchivedClient = projectOf({ id: 'p2', organizationContactId: 'c2', organizationContact: null });
const withoutClient = projectOf({ id: 'p3', organizationContactId: null });

describe('the client of a project', () => {
	it('reads the id from the project, or from its relation when the API sent only that', () => {
		expect(clientIdOf(withAcme)).toBe('c1');
		expect(clientIdOf(projectOf({ organizationContact: { id: 'c7', name: 'Nova' } }))).toBe('c7');
		expect(clientIdOf(withoutClient)).toBeNull();
	});

	it('names the client from the relation', () => {
		expect(clientNameOf(withAcme)).toBe('Acme');
	});

	it('still names an archived client, which the API leaves out of the relation', () => {
		const names = new Map([['c2', 'Zenith']]);
		expect(clientNameOf(withArchivedClient)).toBeNull();
		expect(clientNameOf(withArchivedClient, names)).toBe('Zenith');
	});

	it('has no name without a client', () => {
		expect(clientNameOf(withoutClient, new Map([['c2', 'Zenith']]))).toBeNull();
	});
});

describe('the client filter of the projects list', () => {
	it('is a column and a filter of the list', () => {
		expect(PROJECT_COLUMNS).toContain('client');
		expect(PROJECT_FILTER_FIELDS).toContain('clients');
	});

	it('is read from the URL and counted with the other filters', () => {
		const filters = readProjectFilters(new URLSearchParams('clients=c1,none&teams=t1'));
		expect(filters.clients).toEqual(['c1', NO_CLIENT_FILTER_VALUE]);
		expect(countActiveFilterValues(filters)).toBe(3);
	});

	it('keeps every project when no client is picked', () => {
		expect(projectMatchesFilters(withAcme, filtersOf([]), [])).toBe(true);
		expect(projectMatchesFilters(withoutClient, filtersOf([]), [])).toBe(true);
	});

	it('keeps the projects of the picked clients, archived ones included', () => {
		expect(projectMatchesFilters(withAcme, filtersOf(['c1']), [])).toBe(true);
		expect(projectMatchesFilters(withArchivedClient, filtersOf(['c1']), [])).toBe(false);
		expect(projectMatchesFilters(withArchivedClient, filtersOf(['c1', 'c2']), [])).toBe(true);
		expect(projectMatchesFilters(withoutClient, filtersOf(['c1']), [])).toBe(false);
	});

	it('keeps the projects without a client for "No client"', () => {
		const noClient = filtersOf([NO_CLIENT_FILTER_VALUE]);
		expect(projectMatchesFilters(withoutClient, noClient, [])).toBe(true);
		expect(projectMatchesFilters(withAcme, noClient, [])).toBe(false);
		expect(projectMatchesFilters(withAcme, filtersOf([NO_CLIENT_FILTER_VALUE, 'c1']), [])).toBe(true);
	});
});

describe('the client in the project form', () => {
	const context = { teams: [], tags: [] };

	it('starts without a client on a new project and leaves the field out of the request', () => {
		const draft = emptyProjectDraft(null);
		expect(draft.clientId).toBeNull();
		expect(buildProjectRequest(draft, context)).not.toHaveProperty('organizationContactId');
	});

	it('sends the client picked for a new project', () => {
		const draft = { ...emptyProjectDraft(null), clientId: 'c1' };
		expect(buildProjectRequest(draft, context).organizationContactId).toBe('c1');
	});

	it('opens an existing project with its client, archived or not', () => {
		expect(draftFromProject(withAcme, null).clientId).toBe('c1');
		expect(draftFromProject(withArchivedClient, null).clientId).toBe('c2');
		expect(draftFromProject(withoutClient, null).clientId).toBeNull();
	});

	it('changes the client of an existing project', () => {
		const draft = { ...draftFromProject(withAcme, null), clientId: 'c3' };
		expect(buildProjectRequest(draft, { ...context, base: withAcme }).organizationContactId).toBe('c3');
	});

	it('clears the client of an existing project with null', () => {
		const draft = { ...draftFromProject(withAcme, null), clientId: null };
		const request = buildProjectRequest(draft, { ...context, base: withAcme });
		expect(request).toHaveProperty('organizationContactId', null);
	});
});
