/**
 * @jest-environment node
 */
/**
 * GET /api/timer/status/worked (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getTimerWorkedStatusRequest: (...args: unknown[]) => mockGET(...args)
}));

import { GET } from './route';
import { SIGNED_IN_GUARD, describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/timer/status/worked';

// Without names the route reads the last log of the signed-in employee, and asks nothing for a person who is none
function readOwnLastLog() {
	const employee = { id: 'user-1', employee: { id: 'employee-1' } };
	mockAuthenticatedGuard.mockResolvedValue({ ...SIGNED_IN_GUARD, user: employee });
	return GET(routeRequest(ROUTE, 'GET'));
}

describeRefusalsPassedOn('GET /api/timer/status/worked', mockAuthenticatedGuard, [
	['a read of named teammates', () => GET(routeRequest(`${ROUTE}?employeeIds[0]=employee-2`, 'GET')), mockGET],
	['a read of the own last log', readOwnLastLog, mockGET]
]);
