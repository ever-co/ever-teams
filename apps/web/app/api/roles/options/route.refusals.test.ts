/**
 * @jest-environment node
 */
/**
 * GET and POST /api/roles/options (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockROLE = jest.fn();
const mockINVITE = jest.fn();
const mockLIST = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getEmployeeRoleRequest: (...args: unknown[]) => mockROLE(...args),
	inviteByEmailsRequest: (...args: unknown[]) => mockINVITE(...args),
	getAllTeamInvitationsRequest: (...args: unknown[]) => mockLIST(...args)
}));

import { GET, POST } from './route';
import { describeRefusalsPassedOn, routeRequest } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/roles/options';

function invitation(): Request {
	return new Request(ROUTE, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: new URL(ROUTE).origin },
		body: JSON.stringify({ email: 'lucia@example.com', name: 'Lucia' })
	});
}

// An invitation reads the role first, and answers the list of invitations read after it
function invitationOfAMember() {
	mockROLE.mockResolvedValue({ data: { id: 'role-1' } });
	mockLIST.mockResolvedValue({ data: { id: 'row-1' } });
	return POST(invitation());
}

describeRefusalsPassedOn('GET and POST /api/roles/options', mockAuthenticatedGuard, [
	['a read of the role', () => GET(routeRequest(ROUTE, 'GET')), mockROLE],
	['an invitation', invitationOfAMember, mockINVITE]
]);
