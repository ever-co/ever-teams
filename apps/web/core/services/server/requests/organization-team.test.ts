/**
 * createOrganizationTeamRequest creates the team's project first, then the team. When the API refuses the team (a 4xx
 * answer), the project it made is deleted, so a retry does not leave one more behind; a network failure or a 5xx keeps
 * it (the team may exist), and a failed clean-up never hides the team's own error.
 *
 * The API's answers are rejected exactly like serverFetch rejects them: with a (handled) rejected promise of Gauzy's
 * body, which the code reads with the real unwrapRejection.
 */

const mockServerFetch = jest.fn();

jest.mock('@/core/services/server/fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args),
	unwrapRejection: jest.requireActual('@/core/services/server/fetch').unwrapRejection
}));

// No top-level import in this file: keep it a module so its consts stay file-scoped.
export {};

type TeamRequests = typeof import('./organization-team');
type Fetch = typeof import('../fetch');

function load(): TeamRequests {
	let mod: TeamRequests | undefined;
	jest.isolateModules(() => {
		mod = require('./organization-team');
	});
	return mod as TeamRequests;
}

const { unwrapRejection } = jest.requireActual<Fetch>('@/core/services/server/fetch');

/** A non-2xx answer as serverFetch rejects it: a handled rejected promise of the body. */
function apiAnswer(body: unknown): Promise<never> {
	const inner = Promise.reject(body);
	inner.catch(() => undefined);
	return Promise.reject(inner);
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

/**
 * What `promise` rejects with, untouched. Wrapped in an object: a rejected promise returned from a `.then` callback
 * would be adopted, and serverFetch's rejection value IS a rejected promise.
 */
async function thrownBy(promise: Promise<unknown>): Promise<{ error: unknown }> {
	const outcome = await promise.then(
		() => ({ rejected: false, error: undefined as unknown }),
		(error: unknown) => ({ rejected: true, error })
	);
	if (!outcome.rejected) throw new Error('expected a rejection');
	// Also wrapped: an async function returning a rejected promise would adopt it too
	return { error: outcome.error };
}

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
		'deletes its project when the API refuses the team (%i) and rethrows the rejection as it was',
		async (statusCode) => {
			primeFetch(() => apiAnswer({ statusCode, message: 'refused' }));
			const { createOrganizationTeamRequest } = load();

			const { error: thrown } = await thrownBy(createOrganizationTeamRequest({ ...TEAM }, 'token-1'));

			await expect(unwrapRejection(thrown)).resolves.toEqual({ statusCode, message: 'refused' });
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
		['a 5xx (the team may exist)', () => apiAnswer({ statusCode: 502, message: 'Bad Gateway' })]
	])('keeps the project after %s', async (_label, teamAnswer) => {
		primeFetch(teamAnswer);
		const { createOrganizationTeamRequest } = load();

		await thrownBy(createOrganizationTeamRequest({ ...TEAM }, 'token-1'));
		expect(deletes()).toHaveLength(0);
	});

	it("rethrows the team's own error when the clean-up hangs (after 5 s)", async () => {
		jest.useFakeTimers();
		try {
			primeFetch(
				() => apiAnswer({ statusCode: 400, message: 'refused' }),
				() => new Promise(() => undefined)
			);
			const { createOrganizationTeamRequest } = load();

			const outcome = thrownBy(createOrganizationTeamRequest({ ...TEAM }, 'token-1'));
			await jest.advanceTimersByTimeAsync(5_000);
			const { error: thrown } = await outcome;

			await expect(unwrapRejection(thrown)).resolves.toEqual({ statusCode: 400, message: 'refused' });
		} finally {
			jest.useRealTimers();
		}
	});

	it("rethrows the team's own error when the clean-up fails too", async () => {
		primeFetch(
			() => apiAnswer({ statusCode: 400, message: 'refused' }),
			() => apiAnswer({ statusCode: 500, message: 'delete failed' })
		);
		const { createOrganizationTeamRequest } = load();

		const { error: thrown } = await thrownBy(createOrganizationTeamRequest({ ...TEAM }, 'token-1'));

		await expect(unwrapRejection(thrown)).resolves.toEqual({ statusCode: 400, message: 'refused' });
		expect(deletes()).toHaveLength(1);
	});
});
