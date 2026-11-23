/**
 * @jest-environment node
 */
/**
 * GET /api/timer/slot/window (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/timer/timer-slot', () => ({
	getEmployeeWindowTimeSlotsRequest: (...args: unknown[]) => mockGET(...args)
}));

import { GET } from './route';
import { SIGNED_IN_GUARD, describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/timer/slot/window';
const WINDOW = 'startDate=2026-11-23T09:00:00.000Z&endDate=2026-11-23T09:09:59.999Z';

// The route reads the slots of the signed-in employee only: without one it answers an empty list and asks nothing
function readAsAnEmployee() {
	const employee = { id: 'user-1', employee: { id: 'employee-1' } };
	mockAuthenticatedGuard.mockResolvedValue({ ...SIGNED_IN_GUARD, user: employee });
	return GET(routeRequest(`${ROUTE}?${WINDOW}`, 'GET'));
}

describeRefusalsPassedOn('GET /api/timer/slot/window', mockAuthenticatedGuard, [['a read', readAsAnEmployee, mockGET]]);
