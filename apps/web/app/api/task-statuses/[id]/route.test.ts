/**
 * @jest-environment node
 */
/**
 * PUT and DELETE /api/task-statuses/:id (#5726): a refusal of the API (its 403 for a role that may not change this) left the handler as an
 * unhandled rejection, and the browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/taskStatus', () => ({
	editTaskStatusRequest: (...args: unknown[]) => mockUpdate(...args),
	deleteTaskStatusRequest: (...args: unknown[]) => mockRemove(...args)
}));

import { DELETE, PUT } from './route';

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

function requestOf(method: 'PUT' | 'DELETE', body?: unknown) {
	let sentBody: string | undefined = undefined;
	if (body !== undefined) {
		sentBody = JSON.stringify(body);
	}
	return new Request('https://app.example.com/api/task-statuses/status-1', {
		method,
		headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
		body: sentBody
	});
}

const routeParams = { params: Promise.resolve({ id: 'status-1' }) } as never;
const update = () => PUT(requestOf('PUT', { order: 2 }), routeParams) as Promise<Response>;
const remove = () => DELETE(requestOf('DELETE'), routeParams) as Promise<Response>;

describe('PUT and DELETE /api/task-statuses/:id', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	});

	it.each([
		['an update', update, mockUpdate],
		['a removal', remove, mockRemove]
	])("passes the API's 403 on for %s", async (_case, call, request) => {
		request.mockRejectedValue(refusalOf(FORBIDDEN));

		const response = await call();

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual(FORBIDDEN);
	});

	it.each([
		['an update', update, mockUpdate],
		['a removal', remove, mockRemove]
	])('answers 502 for %s the API gave no answer to', async (_case, call, request) => {
		request.mockRejectedValue(new TypeError('fetch failed'));

		const response = await call();

		expect(response.status).toBe(502);
	});

	it('answers what the API answered when it accepts the update', async () => {
		mockUpdate.mockResolvedValue({ data: { id: 'row-1' } });

		const response = await update();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: 'row-1' });
	});
});
