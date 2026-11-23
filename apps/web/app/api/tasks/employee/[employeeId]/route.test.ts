/**
 * @jest-environment node
 */
/**
 * DELETE /api/tasks/employee/:employeeId (#5727): the API answers this unassignment 200 with an empty body. The route
 * handed that to a JSON answer, which threw, so removing a member said "That change was not saved" although it was.
 * The API is stood in for at `fetch`, so the route's own request helper runs.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { DELETE } from './route';

const originalFetch = global.fetch;

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1'
};

/** The API gives `answer` to the call the route makes; the returned mock records that call. */
function apiAnswers(answer: Response): jest.Mock {
	const fetchMock = jest.fn().mockResolvedValue(answer);
	global.fetch = fetchMock;
	return fetchMock;
}

function unassign() {
	const request = new Request('https://app.example.com/api/tasks/employee/employee-1?organizationTeamId=team-1', {
		method: 'DELETE',
		headers: { origin: 'https://app.example.com' }
	});
	return DELETE(request, { params: Promise.resolve({ employeeId: 'employee-1' }) } as never) as Promise<Response>;
}

describe('DELETE /api/tasks/employee/:employeeId', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it('answers 200 when the API accepted the unassignment with an empty body', async () => {
		const fetchMock = apiAnswers(new Response(null, { status: 200 }));

		const response = await unassign();

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('');
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/tasks/employee/employee-1?organizationTeamId=team-1');
		expect(init.method).toBe('DELETE');
	});

	it('passes on what the API answered when it answers a body', async () => {
		apiAnswers(Response.json({ affected: 2 }, { status: 200 }));

		const response = await unassign();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ affected: 2 });
	});

	it('passes a refusal of the API on with its status', async () => {
		const forbidden = { statusCode: 403, message: 'Forbidden resource' };
		apiAnswers(Response.json(forbidden, { status: 403 }));

		const response = await unassign();

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual(forbidden);
	});

	it('keeps the status of a refusal whose body is empty', async () => {
		apiAnswers(new Response(null, { status: 403, statusText: 'Forbidden' }));

		const response = await unassign();

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden' });
	});
});
