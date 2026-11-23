/**
 * @jest-environment node
 */
/**
 * GET /api/timer/daily (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/timer/daily', () => ({
	getEmployeeDailyRequest: (...args: unknown[]) => mockGET(...args)
}));

import { GET } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/timer/daily';
const DAY = 'startDate=2026-11-23T00:00:00.000Z&endDate=2026-11-23T23:59:59.999Z';

describeRefusalsPassedOn('GET /api/timer/daily', mockAuthenticatedGuard, [
	['a read', () => GET(routeRequest(`${ROUTE}?${DAY}`, 'GET')), mockGET]
]);
