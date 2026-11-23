/**
 * @jest-environment node
 */
/**
 * GET and POST /api/task-versions (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();
const mockPOST = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/task-version', () => ({
	getTaskVersionListRequest: (...args: unknown[]) => mockGET(...args),
	createVersionRequest: (...args: unknown[]) => mockPOST(...args)
}));

import { GET, POST } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/task-versions';

describeRefusalsPassedOn('GET and POST /api/task-versions', mockAuthenticatedGuard, [
	['a read', () => GET(routeRequest(ROUTE, 'GET')) as Promise<Response>, mockGET],
	['a creation', () => POST(routeRequest(ROUTE, 'POST')) as Promise<Response>, mockPOST]
]);
