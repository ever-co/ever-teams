/**
 * createOrganizationTeamRequest creates the team's project first, then the team. When the API refuses the team (a 4xx
 * answer), the project it made is deleted, so a retry does not leave one more behind; a network failure or a 5xx keeps
 * it (the team may exist), and a failed clean-up never hides the team's own error.
 */

const mockServerFetch = jest.fn();

jest.mock('@/core/services/server/fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

// No top-level import in this file: keep it a module so its consts stay file-scoped.
export {};

type TeamRequests = typeof import('./organization-team');

function load(): TeamRequests {
	let mod: TeamRequests | undefined;
	jest.isolateModules(() => {
		mod = require('./organization-team');
	});
	return mod as TeamRequests;
}

const TEAM = { name: 'Acme Team', tenantId: 't1', organizationId: 'org-1', managerIds: ['emp-1'], public: true };

/** Answers the project POST, then the team POST with `teamAnswer`; any DELETE with `deleteAnswer`. */
function primeFetch(
	teamAnswer: () => Promise<unknown>,
	deleteAnswer: () => Promise<unknown> = () => Promise.resolve({ data: {} })
) {
	mockServerFetch.mockImplementation(({ path, method }: { path: string; method: string }) => {
		if (path === '/organization-projects' && method === 'POST') return Promise.resolve({ data: { id: 'proj-1' } });
		if (path === '/organization-team' && method === 'POST') return teamAnswer();
		if (method === 'DELETE') return deleteAnswer();
		return Promise.reject(new Error(`unexpected ${method} ${path}`));
	});
}

const deletes = () => mockServerFetch.mock.calls.filter(([options]) => options.method === 'DELETE');

afterEach(() => {
	jest.resetAllMocks();
});

describe('createOrganizationTeamRequest', () => {
	it('creates the project, then the team with it', async () => {
		primeFetch(() => Promise.resolve({ data: { id: 'team-1' } }));
		const { createOrganizationTeamRequest } = load();

		const { data } = await createOrganizationTeamRequest({ ...TEAM }, 'token-1');

		expect(data).toEqual({ id: 'team-1' });
		const teamCall = mockServerFetch.mock.calls.find(([options]) => options.path === '/organization-team');
		expect(teamCall?.[0].body.projects).toEqual([{ id: 'proj-1' }]);
		expect(deletes()).toHaveLength(0);
	});

	it.each([400, 403, 409, 422])(
		'deletes its project when the API refuses the team (%i) and rethrows',
		async (statusCode) => {
			const refusal = { statusCode, message: 'refused' };
			primeFetch(() => Promise.reject(refusal));
			const { createOrganizationTeamRequest } = load();

			await expect(createOrganizationTeamRequest({ ...TEAM }, 'token-1')).rejects.toBe(refusal);
			expect(deletes()).toHaveLength(1);
			expect(deletes()[0][0]).toEqual(
				expect.objectContaining({
					path: '/organization-projects/proj-1',
					bearer_token: 'token-1',
					tenantId: 't1'
				})
			);
		}
	);

	it.each([
		['a network failure', () => Promise.reject(new Error('socket hang up'))],
		['a 5xx (the team may exist)', () => Promise.reject({ statusCode: 502, message: 'Bad Gateway' })]
	])('keeps the project after %s', async (_label, teamAnswer) => {
		primeFetch(teamAnswer);
		const { createOrganizationTeamRequest } = load();

		await expect(createOrganizationTeamRequest({ ...TEAM }, 'token-1')).rejects.toBeDefined();
		expect(deletes()).toHaveLength(0);
	});

	it("rethrows the team's own error when the clean-up fails too", async () => {
		const refusal = { statusCode: 400, message: 'refused' };
		primeFetch(
			() => Promise.reject(refusal),
			() => Promise.reject(new Error('delete failed'))
		);
		const { createOrganizationTeamRequest } = load();

		await expect(createOrganizationTeamRequest({ ...TEAM }, 'token-1')).rejects.toBe(refusal);
		expect(deletes()).toHaveLength(1);
	});
});
