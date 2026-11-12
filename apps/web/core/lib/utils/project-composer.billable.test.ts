import type { TOrganizationProject } from '@/core/types/schemas';
import { buildProjectRequest, draftFromProject, emptyProjectDraft, type ProjectDraft } from './project-composer';

const TEAM_ID = 'team-1';
const TODAY = new Date(2026, 10, 12);

function projectOf(fields: Partial<TOrganizationProject>): TOrganizationProject {
	return { id: 'project-1', name: 'Website', public: null, owner: null, code: null, ...fields };
}

function saveOf(draft: ProjectDraft, base?: TOrganizationProject) {
	return buildProjectRequest(draft, { base, teams: [], tags: [] });
}

describe('the billable choice of a project draft', () => {
	it('starts a new project without a choice', () => {
		const draft = emptyProjectDraft(TEAM_ID, TODAY);

		expect(draft.billable).toBeNull();
	});

	it.each([true, false])('opens a project on the value it holds (%s)', (billable) => {
		const project = projectOf({ billable });

		const draft = draftFromProject(project, TEAM_ID);

		expect(draft.billable).toBe(billable);
	});

	it.each([null, undefined])('opens a project that never chose without a choice (%s)', (billable) => {
		const project = projectOf({ billable });

		const draft = draftFromProject(project, TEAM_ID);

		expect(draft.billable).toBeNull();
	});
});

describe('the billable setting in a project save', () => {
	it('leaves the setting out of a new project nobody chose for', () => {
		const draft = emptyProjectDraft(TEAM_ID, TODAY);

		const save = saveOf(draft);

		expect('billable' in save).toBe(false);
	});

	it.each([true, false])('sends the choice %s made on a new project', (billable) => {
		const draft = { ...emptyProjectDraft(TEAM_ID, TODAY), billable };

		const save = saveOf(draft);

		expect(save.billable).toBe(billable);
	});

	it('leaves a project that never chose as it is when another field is edited', () => {
		const project = projectOf({ billable: null });
		const draft = { ...draftFromProject(project, TEAM_ID), name: 'Website, second version' };

		const save = saveOf(draft, project);

		expect(save.name).toBe('Website, second version');
		expect('billable' in save).toBe(false);
	});

	it('sends the value turned on for a project that was not billable', () => {
		const project = projectOf({ billable: false });
		const draft = { ...draftFromProject(project, TEAM_ID), billable: true };

		const save = saveOf(draft, project);

		expect(save.billable).toBe(true);
	});

	it('sends the value turned off for a project that was billable', () => {
		const project = projectOf({ billable: true });
		const draft = { ...draftFromProject(project, TEAM_ID), billable: false };

		const save = saveOf(draft, project);

		expect(save.billable).toBe(false);
	});
});
