import { buildProjectRequest, draftInWorkspaceCurrency, emptyProjectDraft } from './project-composer';

describe("the currency of a new project's budget (#5087)", () => {
	const today = new Date(2026, 10, 12);
	const emptyDraft = emptyProjectDraft('team-a', today);

	it("is the workspace's until the person picks one, and is saved with the project", () => {
		const draft = draftInWorkspaceCurrency(emptyDraft, 'EUR');
		const request = buildProjectRequest({ ...draft, name: 'Website' }, { teams: [], tags: [] });

		expect(emptyDraft.currency).toBeNull();
		expect(draft.currency).toBe('EUR');
		expect(request.currency).toBe('EUR');
	});

	it('is the one the person picked, whatever the workspace offers', () => {
		const pickedDraft = { ...emptyDraft, currency: 'USD' };

		expect(draftInWorkspaceCurrency(pickedDraft, 'EUR')).toBe(pickedDraft);
	});

	it('stays unset while the workspace has no currency to offer', () => {
		const draft = draftInWorkspaceCurrency(emptyDraft, null);
		const request = buildProjectRequest({ ...draft, name: 'Website' }, { teams: [], tags: [] });

		expect(draft.currency).toBeNull();
		expect(request.currency).toBeUndefined();
	});
});
