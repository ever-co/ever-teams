import { isPrivateProject, shownVisibilityOf, visibilityFieldOf, visibilityOfProject } from './project-visibility';
import { buildProjectRequest, draftFromProject, emptyProjectDraft } from './project-composer';
import type { TOrganizationProject } from '@/core/types/schemas';

describe('who sees a project (CORE-08)', () => {
	it('keeps only a project stated private to its people: one that never chose is seen by everyone', () => {
		expect(isPrivateProject({ public: false })).toBe(true);
		expect(isPrivateProject({ public: true })).toBe(false);
		expect(isPrivateProject({ public: null })).toBe(false);
		expect(isPrivateProject(null)).toBe(false);
	});

	it('reads the stored choice, and none when the project never chose', () => {
		expect(visibilityOfProject({ public: false })).toBe('private');
		expect(visibilityOfProject({ public: true })).toBe('everyone');
		expect(visibilityOfProject({ public: null })).toBeNull();
	});

	it('shows Everyone until someone picks Members and managers only', () => {
		expect(shownVisibilityOf(null)).toBe('everyone');
		expect(shownVisibilityOf('private')).toBe('private');
	});

	it('saves the choice only once someone made one', () => {
		expect(visibilityFieldOf(null)).toEqual({});
		expect(visibilityFieldOf('private')).toEqual({ public: false });
		expect(visibilityFieldOf('everyone')).toEqual({ public: true });
	});
});

describe('the project form and who sees the project', () => {
	const context = { teams: [], tags: [] };

	it('starts a new project as Everyone and leaves the field out of its save', () => {
		const draft = emptyProjectDraft(null);

		expect(draft.visibility).toBeNull();
		expect(buildProjectRequest({ ...draft, name: 'Client X redesign' }, context)).not.toHaveProperty('public');
	});

	it('saves a new project made private as such', () => {
		const draft = { ...emptyProjectDraft(null), name: 'Client X redesign', visibility: 'private' as const };

		expect(buildProjectRequest(draft, context)).toMatchObject({ public: false });
	});

	it('edits a private project with its choice, and one that never chose without touching it', () => {
		const stored = { id: 'project-1', name: 'Client X redesign', public: false } as TOrganizationProject;
		const neverChose = { id: 'project-2', name: 'Website', public: null } as TOrganizationProject;

		expect(buildProjectRequest(draftFromProject(stored, null), { ...context, base: stored })).toMatchObject({
			public: false
		});
		expect(
			buildProjectRequest(draftFromProject(neverChose, null), { ...context, base: neverChose })
		).not.toHaveProperty('public');
	});

	it('makes a private project Everyone again', () => {
		const stored = { id: 'project-1', name: 'Client X redesign', public: false } as TOrganizationProject;
		const draft = { ...draftFromProject(stored, null), visibility: 'everyone' as const };

		expect(buildProjectRequest(draft, { ...context, base: stored })).toMatchObject({ public: true });
	});
});
