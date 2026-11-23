/**
 * @jest-environment node
 */
/**
 * GET /api/integration/types (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getIntegrationTypesRequest: (...args: unknown[]) => mockGET(...args)
}));

import { GET } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/integration/types';

describeRefusalsPassedOn('GET /api/integration/types', mockAuthenticatedGuard, [
	['a read', () => GET(routeRequest(ROUTE, 'GET')) as Promise<Response>, mockGET]
]);
