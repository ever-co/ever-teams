/**
 * An API without the two-factor routes, or a reverse proxy in front of it, may answer a bare 404: every request keeps
 * the status of such a refusal, so the settings read "not offered" instead of a broken 502.
 */
const mockServerFetch = jest.fn();

jest.mock('../fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

import {
	confirmTwoFactorRequest,
	disableTwoFactorRequest,
	enrollTwoFactorRequest,
	regenerateRecoveryCodesRequest,
	resetMemberTwoFactorRequest,
	twoFactorStatusRequest,
	verifyTwoFactorRequest
} from './two-factor';

const SESSION = { bearer_token: 'token', tenantId: 'tenant-1' };

describe('the two-factor requests to Gauzy', () => {
	it.each([
		['status', () => twoFactorStatusRequest({ ...SESSION, organizationId: 'organization-1' })],
		['enroll', () => enrollTwoFactorRequest({ ...SESSION, issuer: 'Ever Teams' })],
		['confirm', () => confirmTwoFactorRequest({ ...SESSION, code: '123456' })],
		['disable', () => disableTwoFactorRequest({ ...SESSION, proof: { code: '123456' } })],
		['recovery codes', () => regenerateRecoveryCodesRequest({ ...SESSION, proof: { code: '123456' } })],
		['member reset', () => resetMemberTwoFactorRequest({ ...SESSION, userId: 'user-1' })],
		['verify', () => verifyTwoFactorRequest({ challenge: 'signed', code: '123456' })]
	])('%s keeps the status of a refusal without a body', async (_name, request) => {
		mockServerFetch.mockResolvedValue({ data: {} });

		await request();

		expect(mockServerFetch).toHaveBeenCalledWith(expect.objectContaining({ keepsStatusOnError: true }));
	});
});
