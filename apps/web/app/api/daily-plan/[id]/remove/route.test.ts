/**
 * @jest-environment node
 */
/**
 * PUT /api/daily-plan/:id/remove (#5726): a refusal of the API left the handler as an unhandled rejection, and the browser got an
 * empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockRemoveFromPlans = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	deleteDailyPlansManyRequest: (...args: unknown[]) => mockRemoveFromPlans(...args)
}));

import { PUT } from './route';
import { describeRefusalsPassedOn } from '@/test/api/refusals-passed-on';

function requestOf(method: string, body?: unknown) {
	let sentBody: string | undefined = undefined;
	if (body !== undefined) {
		sentBody = JSON.stringify(body);
	}
	return new Request('https://app.example.com/api/daily-plan/task-1/remove', {
		method,
		headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
		body: sentBody
	});
}

const routeParams = { params: Promise.resolve({ id: 'task-1' }) };
const removeFromPlans = () =>
	PUT(requestOf('PUT', { employeeId: 'employee-1', plansIds: ['plan-1'] }), routeParams) as Promise<Response>;

describeRefusalsPassedOn('PUT /api/daily-plan/:id/remove', mockAuthenticatedGuard, [
	['a removal from every plan', removeFromPlans, mockRemoveFromPlans]
]);
