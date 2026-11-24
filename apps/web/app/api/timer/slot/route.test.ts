/**
 * @jest-environment node
 */
/**
 * GET and DELETE /api/timer/slot (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();
const mockDELETE = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/timer/timer-slot', () => ({
	getEmployeeTimeSlotsRequest: (...args: unknown[]) => mockGET(...args),
	deleteEmployeeTimeSlotsRequest: (...args: unknown[]) => mockDELETE(...args)
}));

import { DELETE, GET } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/timer/slot';
const DAY = 'todayStart=2026-11-23T00:00:00.000Z&todayEnd=2026-11-23T23:59:59.999Z';

describeRefusalsPassedOn('GET and DELETE /api/timer/slot', mockAuthenticatedGuard, [
	['a read', () => GET(routeRequest(`${ROUTE}?${DAY}`, 'GET')), mockGET],
	['a delete', () => DELETE(routeRequest(`${ROUTE}?ids[0]=slot-1`, 'DELETE')), mockDELETE]
]);
