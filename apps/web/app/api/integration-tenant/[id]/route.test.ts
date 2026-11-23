/**
 * @jest-environment node
 */
/**
 * DELETE /api/integration-tenant/:id (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockDELETE = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	deleteIntegrationTenantRequest: (...args: unknown[]) => mockDELETE(...args)
}));

import { DELETE } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/integration-tenant/integration-1';

const routeParams = { params: Promise.resolve({ id: 'integration-1' }) } as never;

describeRefusalsPassedOn('DELETE /api/integration-tenant/:id', mockAuthenticatedGuard, [
	['a deletion', () => DELETE(routeRequest(ROUTE, 'DELETE'), routeParams) as Promise<Response>, mockDELETE]
]);
