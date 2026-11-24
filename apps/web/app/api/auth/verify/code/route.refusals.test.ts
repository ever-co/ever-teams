/**
 * @jest-environment node
 */
/**
 * POST /api/auth/verify/code (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPOST = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	verifyUserEmailByCodeRequest: (...args: unknown[]) => mockPOST(...args)
}));

import { POST } from './route';
import { describeRefusalsPassedOn } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/auth/verify/code';

function confirmation(): Request {
	return new Request(ROUTE, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: new URL(ROUTE).origin },
		body: JSON.stringify({ code: 'ABCD1234' })
	});
}

describeRefusalsPassedOn('POST /api/auth/verify/code', mockAuthenticatedGuard, [
	['a confirmation', () => POST(confirmation()), mockPOST]
]);

describe('POST /api/auth/verify/code, for a code the API refuses', () => {
	it("passes the API's 400 and its reason on", async () => {
		const { SIGNED_IN_GUARD } = jest.requireActual('@/test/api/refusals-passed-on');
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN_GUARD);
		const refusal = { statusCode: 400, message: 'Failed to verify email.' };
		// serverFetch rejects with a rejected promise of the API's error body
		const rejection = Promise.reject(refusal);
		rejection.catch(() => undefined);
		mockPOST.mockRejectedValue(rejection);

		const response = await POST(confirmation());

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual(refusal);
	});
});
