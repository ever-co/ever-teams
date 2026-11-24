/**
 * @jest-environment node
 */
/**
 * GET /api/timer/timesheet/statistics-tasks (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	tasksTimesheetStatisticsRequest: (...args: unknown[]) => mockGET(...args)
}));

import { GET } from './route';
import { SIGNED_IN_GUARD, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/timer/timesheet/statistics-tasks';

describe('GET /api/timer/timesheet/statistics-tasks', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN_GUARD);
	});

	// serverFetch rejects with a rejected promise of the API's error body
	function refusal() {
		const rejection = Promise.reject({ statusCode: 403, message: 'Forbidden resource' });
		rejection.catch(() => undefined);
		return rejection;
	}

	it("passes the API's 403 on for the totals", async () => {
		mockGET.mockRejectedValue(refusal());

		const response = await GET(routeRequest(`${ROUTE}?employeeId=employee-1`, 'GET'));

		expect(response.status).toBe(403);
	});

	it("passes the API's 403 on for the totals of today", async () => {
		mockGET.mockResolvedValueOnce({ data: [] });
		mockGET.mockRejectedValueOnce(refusal());

		const response = await GET(routeRequest(`${ROUTE}?employeeId=employee-1`, 'GET'));

		expect(response.status).toBe(403);
	});

	it('answers 502 for a read the API gave no answer to', async () => {
		mockGET.mockRejectedValue(new TypeError('fetch failed'));

		const response = await GET(routeRequest(`${ROUTE}?employeeId=employee-1`, 'GET'));

		expect(response.status).toBe(502);
	});

	it('answers both totals for a read the API accepts', async () => {
		mockGET.mockResolvedValueOnce({ data: [{ id: 'task-1' }] });
		mockGET.mockResolvedValueOnce({ data: [] });

		const response = await GET(routeRequest(`${ROUTE}?employeeId=employee-1`, 'GET'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ global: [{ id: 'task-1' }], today: [] });
	});
});
