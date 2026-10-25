/**
 * POST /api/invite/emails is the proxy-mode twin of Gauzy's /invite/emails. It used to send the EMPLOYEE role
 * whatever the invite form picked (ever-co/ever-teams#4805): the role in the body must reach Gauzy, and an invite
 * that names no role stays an Employee invite, as direct mode does.
 */
import { signedIn } from '@/test/auth/guard-answers';
import { POST } from './route';

const mockAuthenticatedGuard = jest.fn();
const mockGetEmployeeRoleRequest = jest.fn();
const mockInviteByEmailsRequest = jest.fn();
const mockGetAllTeamInvitationsRequest = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

jest.mock('@/core/services/server/requests', () => ({
	getEmployeeRoleRequest: (...args: unknown[]) => mockGetEmployeeRoleRequest(...args),
	inviteByEmailsRequest: (...args: unknown[]) => mockInviteByEmailsRequest(...args),
	getAllTeamInvitationsRequest: (...args: unknown[]) => mockGetAllTeamInvitationsRequest(...args)
}));

const INVITEE = { email: 'invitee@example.test', name: 'Invited Person' };
const INVITATIONS = { items: [], total: 0 };

function inviteRequest(body: Record<string, unknown>) {
	return new Request('https://app.ever.team/api/invite/emails', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/** The invite Gauzy was asked to create. */
function sentInvite() {
	return mockInviteByEmailsRequest.mock.calls[0][0];
}

beforeEach(() => {
	const session = signedIn({ id: 'user-1' });
	mockAuthenticatedGuard.mockResolvedValue(session);
	mockGetEmployeeRoleRequest.mockResolvedValue({ data: { id: 'employee-role' } });
	mockInviteByEmailsRequest.mockResolvedValue({ data: INVITATIONS });
	mockGetAllTeamInvitationsRequest.mockResolvedValue({ data: INVITATIONS });
});

describe('POST /api/invite/emails', () => {
	it('sends the role picked in the invite form', async () => {
		const request = inviteRequest({ ...INVITEE, roleId: 'manager-role' });

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockInviteByEmailsRequest).toHaveBeenCalledTimes(1);
		const invite = sentInvite();
		expect(invite).toMatchObject({ roleId: 'manager-role' });
	});

	it.each([
		['sends no role', {}],
		['sends an empty role', { roleId: '' }]
	])('keeps the EMPLOYEE role when the form %s', async (_case, role) => {
		const request = inviteRequest({ ...INVITEE, ...role });

		await POST(request);

		const invite = sentInvite();
		expect(invite).toMatchObject({ roleId: 'employee-role' });
	});
});
