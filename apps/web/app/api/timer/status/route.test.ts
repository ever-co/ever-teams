/**
 * @jest-environment node
 */
/**
 * GET /api/timer/status (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getTimerStatusRequest: (...args: unknown[]) => mockGET(...args),
	readTodayRange: () => ({})
}));

import { GET } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/timer/status';

describeRefusalsPassedOn('GET /api/timer/status', mockAuthenticatedGuard, [
	['a read', () => GET(routeRequest(ROUTE, 'GET')), mockGET]
]);
