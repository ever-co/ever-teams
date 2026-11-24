/**
 * @jest-environment node
 */
/**
 * GET, PUT and DELETE /api/organization-team/:id (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();
const mockPUT = jest.fn();
const mockDELETE = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getOrganizationTeamRequest: (...args: unknown[]) => mockGET(...args),
	updateOrganizationTeamRequest: (...args: unknown[]) => mockPUT(...args),
	deleteOrganizationTeamRequest: (...args: unknown[]) => mockDELETE(...args)
}));

import { DELETE, GET, PUT } from './route';
import { SIGNED_IN_GUARD, describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/organization-team/team-1';
const params = { params: Promise.resolve({ id: 'team-1' }) };

// An update reads the team again once the API took it
function updateThatIsReadAgain() {
	mockGET.mockResolvedValue({ data: { id: 'row-1' } });
	return PUT(routeRequest(ROUTE, 'PUT'), params) as Promise<Response>;
}

describeRefusalsPassedOn('GET, PUT and DELETE /api/organization-team/:id', mockAuthenticatedGuard, [
	['a read', () => GET(routeRequest(ROUTE, 'GET'), params) as Promise<Response>, mockGET],
	['an update', updateThatIsReadAgain, mockPUT],
	['a delete', () => DELETE(routeRequest(ROUTE, 'DELETE'), params), mockDELETE]
]);

describe('PUT /api/organization-team/:id, when the read after the update is refused', () => {
	it("passes the API's 403 on", async () => {
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN_GUARD);
		mockPUT.mockResolvedValue({ data: {} });
		// serverFetch rejects with a rejected promise of the API's error body
		const refusal = Promise.reject({ statusCode: 403, message: 'Forbidden resource' });
		refusal.catch(() => undefined);
		mockGET.mockRejectedValue(refusal);

		const response = (await PUT(routeRequest(ROUTE, 'PUT'), params)) as Response;

		expect(response.status).toBe(403);
	});
});
