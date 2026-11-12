import { buildProjectRequest, emptyProjectDraft } from './project-composer';

describe("the currency of a new project's budget (#5087)", () => {
	const today = new Date(2026, 10, 12);

	it("starts in the workspace's currency, and is saved with the project", () => {
		const draft = emptyProjectDraft('team-a', today, 'EUR');
		const request = buildProjectRequest({ ...draft, name: 'Website' }, { teams: [], tags: [] });

		expect(draft.currency).toBe('EUR');
		expect(request.currency).toBe('EUR');
	});

	it('stays unset while the workspace has no currency to offer', () => {
		const draft = emptyProjectDraft('team-a', today);
		const request = buildProjectRequest({ ...draft, name: 'Website' }, { teams: [], tags: [] });

		expect(draft.currency).toBeNull();
		expect(request.currency).toBeUndefined();
	});
});
