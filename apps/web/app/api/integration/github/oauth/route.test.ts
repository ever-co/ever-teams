/**
 * @jest-environment node
 */
/**
 * POST /api/integration/github/oauth (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPOST = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	oAuthEndpointAuthorization: (...args: unknown[]) => mockPOST(...args)
}));

import { POST } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/integration/github/oauth';

describeRefusalsPassedOn('POST /api/integration/github/oauth', mockAuthenticatedGuard, [
	['a creation', () => POST(routeRequest(ROUTE, 'POST')) as Promise<Response>, mockPOST]
]);
