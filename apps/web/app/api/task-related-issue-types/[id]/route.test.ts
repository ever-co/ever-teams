/**
 * @jest-environment node
 */
/**
 * PUT and DELETE /api/task-related-issue-types/:id (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPUT = jest.fn();
const mockDELETE = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/task-related-issue-type', () => ({
	editTaskRelatedIssueTypeRequest: (...args: unknown[]) => mockPUT(...args),
	deleteTaskRelatedIssueTypeRequest: (...args: unknown[]) => mockDELETE(...args)
}));

import { PUT, DELETE } from './route';

const FORBIDDEN = { statusCode: 403, message: 'Forbidden resource' };

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	teamId: 'team-1'
};

/** What serverFetch throws for an answer that is not 2xx: a rejected promise of the API's error body. */
function refusalOf(body: unknown) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

function requestOf(method: string) {
	const hasBody = method !== 'GET' && method !== 'DELETE';
	let body: string | undefined = undefined;
	if (hasBody) {
		body = JSON.stringify({ name: 'Sample' });
	}
	return new Request('https://app.example.com/api/task-related-issue-types/type-1', {
		method,
		headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
		body
	});
}

const routeParams = { params: Promise.resolve({ id: 'type-1' }) } as never;

const CALLS = [
	['an update', () => PUT(requestOf('PUT'), routeParams) as Promise<Response>, mockPUT],
	['a deletion', () => DELETE(requestOf('DELETE'), routeParams) as Promise<Response>, mockDELETE]
] as const;

describe('PUT and DELETE /api/task-related-issue-types/:id', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	});

	it.each(CALLS)("passes the API's 403 on for %s", async (_case, call, request) => {
		request.mockRejectedValue(refusalOf(FORBIDDEN));

		const response = await call();

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual(FORBIDDEN);
	});

	it.each(CALLS)('answers 502 for %s the API gave no answer to', async (_case, call, request) => {
		request.mockRejectedValue(new TypeError('fetch failed'));

		const response = await call();

		expect(response.status).toBe(502);
	});

	it.each(CALLS)('answers what the API answered for %s it accepts', async (_case, call, request) => {
		request.mockResolvedValue({ data: { id: 'row-1' } });

		const response = await call();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: 'row-1' });
	});
});
