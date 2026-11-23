/**
 * @jest-environment node
 */
/**
 * POST /api/invite/resend (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPOST = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	resendInvitationEmailRequest: (...args: unknown[]) => mockPOST(...args)
}));

import { POST } from './route';
import { describeRefusalsPassedOn } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/invite/resend';

/** The route checks the invitation it is asked to send again before it calls the API. */
function resend() {
	const request = new Request(ROUTE, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: new URL(ROUTE).origin },
		body: JSON.stringify({ inviteId: 'invite-1' })
	});
	return POST(request) as Promise<Response>;
}

describeRefusalsPassedOn('POST /api/invite/resend', mockAuthenticatedGuard, [
	['an invitation sent again', resend, mockPOST]
]);

describe('POST /api/invite/resend without an invitation', () => {
	it('answers 400 and calls nothing', async () => {
		mockAuthenticatedGuard.mockResolvedValue({
			$res: (data: unknown) => Response.json(data),
			user: { id: 'user-1' },
			access_token: 'session-token',
			tenantId: 'tenant-1',
			organizationId: 'organization-1'
		});
		const request = new Request(ROUTE, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: new URL(ROUTE).origin },
			body: JSON.stringify({})
		});

		const response = (await POST(request)) as Response;

		expect(response.status).toBe(400);
		expect(mockPOST).not.toHaveBeenCalled();
	});
});
