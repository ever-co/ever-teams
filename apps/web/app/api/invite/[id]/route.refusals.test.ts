/**
 * @jest-environment node
 */
/**
 * GET, DELETE and PUT /api/invite/:id (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGET = jest.fn();
const mockDELETE = jest.fn();
const mockLIST = jest.fn();
const mockPUT = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getMyInvitationsRequest: (...args: unknown[]) => mockGET(...args),
	removeTeamInvitationsRequest: (...args: unknown[]) => mockDELETE(...args),
	getAllTeamInvitationsRequest: (...args: unknown[]) => mockLIST(...args),
	acceptRejectMyInvitationsRequest: (...args: unknown[]) => mockPUT(...args)
}));

import { DELETE, GET, PUT } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/invite/invite-1';
const params = { params: Promise.resolve({ id: 'invite-1' }) };

// A removal answers the list of invitations read after it
function removalThatReadsTheList() {
	mockLIST.mockResolvedValue({ data: { id: 'row-1' } });
	return DELETE(routeRequest(ROUTE, 'DELETE'), params);
}

describeRefusalsPassedOn('GET, DELETE and PUT /api/invite/:id', mockAuthenticatedGuard, [
	['a read', () => GET(routeRequest(ROUTE, 'GET'), params), mockGET],
	['a removal', removalThatReadsTheList, mockDELETE],
	['an answer', () => PUT(routeRequest(`${ROUTE}?action=ACCEPTED`, 'PUT'), params), mockPUT]
]);
