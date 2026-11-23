/**
 * @jest-environment node
 */
/**
 * POST and GET /api/organization-projects (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPOST = jest.fn();
const mockGET = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	createOrganizationProjectRequest: (...args: unknown[]) => mockPOST(...args),
	getOrganizationProjectsRequest: (...args: unknown[]) => mockGET(...args)
}));

import { POST, GET } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/organization-projects';

describeRefusalsPassedOn('POST and GET /api/organization-projects', mockAuthenticatedGuard, [
	['a creation', () => POST(routeRequest(ROUTE, 'POST')) as Promise<Response>, mockPOST],
	['a read', () => GET(routeRequest(ROUTE, 'GET')) as Promise<Response>, mockGET]
]);
