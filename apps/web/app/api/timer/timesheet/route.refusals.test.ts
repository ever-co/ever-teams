/**
 * @jest-environment node
 */
/**
 * GET /api/timer/timesheet (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	taskActivityRequest: (...args: unknown[]) => mockGET(...args),
	readArrayParam: () => ['task-1']
}));

import { GET } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/timer/timesheet';

describeRefusalsPassedOn('GET /api/timer/timesheet', mockAuthenticatedGuard, [
	['a read', () => GET(routeRequest(`${ROUTE}?taskIds[0]=task-1`, 'GET')), mockGET]
]);
