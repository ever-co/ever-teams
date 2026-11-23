/**
 * @jest-environment node
 */
/**
 * POST and PUT /api/daily-plan/plan/:planId (#5726): a refusal of the API left the handler as an unhandled rejection, and the browser got an
 * empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockAddTask = jest.fn();
const mockRemoveTask = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	addTaskToDailyPlanRequest: (...args: unknown[]) => mockAddTask(...args),
	removeTaskFromPlanRequest: (...args: unknown[]) => mockRemoveTask(...args)
}));

import { POST, PUT } from './route';

const FORBIDDEN = { statusCode: 403, message: 'Forbidden resource' };

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1'
};

/** What serverFetch throws for an answer that is not 2xx: a rejected promise of the API's error body. */
function refusalOf(body: unknown) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

function requestOf(method: string, body?: unknown) {
	let sentBody: string | undefined = undefined;
	if (body !== undefined) {
		sentBody = JSON.stringify(body);
	}
	return new Request('https://app.example.com/api/daily-plan/plan/plan-1', {
		method,
		headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
		body: sentBody
	});
}

const routeParams = { params: Promise.resolve({ planId: 'plan-1' }) };
const addTask = () => POST(requestOf('POST', { taskId: 'task-1' }), routeParams) as Promise<Response>;
const removeTask = () => PUT(requestOf('PUT', { taskId: 'task-1' }), routeParams) as Promise<Response>;

const CALLS = [
	['a task added', addTask, mockAddTask],
	['a task removed', removeTask, mockRemoveTask]
] as const;

describe('POST and PUT /api/daily-plan/plan/:planId', () => {
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
		request.mockResolvedValue({ data: { id: 'plan-1' } });

		const response = await call();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: 'plan-1' });
	});
});
