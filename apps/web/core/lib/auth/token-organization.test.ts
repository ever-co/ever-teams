/**
 * Gauzy confines a non-admin to the organization in their access token. When the organization Ever Teams acts in (the
 * active team's, kept in the organization cookie) differs, the token is switched with POST /auth/switch-organization.
 */
const mockCookies = { token: '', organizationId: '' };
const mockSet = { access: jest.fn(), refresh: jest.fn(), organization: jest.fn() };
const mockSwitch = jest.fn();

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => mockCookies.token,
	getOrganizationIdCookie: () => mockCookies.organizationId,
	setAccessTokenCookie: (...args: unknown[]) => mockSet.access(...args),
	setRefreshTokenCookie: (...args: unknown[]) => mockSet.refresh(...args),
	setOrganizationIdCookie: (...args: unknown[]) => mockSet.organization(...args)
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { switchOrganizationRaw: (...args: unknown[]) => mockSwitch(...args) }
}));

import { resetTokenOrganizationState, syncTokenOrganization, tokenOrganizationId } from './token-organization';

/** An access token that decodes (only its payload is read). */
function token(organizationId: string | null) {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	const payload = { id: 'user-1', organizationId, iat: now, exp: now + 3600 };
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.sig`;
}

beforeEach(() => {
	resetTokenOrganizationState();
	jest.clearAllMocks();
	mockCookies.token = token('org-a');
	mockCookies.organizationId = 'org-a';
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('syncTokenOrganization', () => {
	it('asks nothing when the token already acts in the organization', async () => {
		expect(await syncTokenOrganization()).toBe(false);
		expect(tokenOrganizationId()).toBe('org-a');
		expect(mockSwitch).not.toHaveBeenCalled();
	});

	it("switches the token to the active team's organization and stores the new tokens", async () => {
		mockSwitch.mockResolvedValue({ data: { token: 'new-access', refresh_token: 'new-refresh' } });

		expect(await syncTokenOrganization('org-b')).toBe(true);

		expect(mockSwitch).toHaveBeenCalledWith('org-b');
		expect(mockSet.access).toHaveBeenCalledWith('new-access');
		expect(mockSet.refresh).toHaveBeenCalledWith('new-refresh');
		expect(mockSet.organization).toHaveBeenCalledWith('org-b');
	});

	it('follows the organization cookie by default', async () => {
		mockCookies.organizationId = 'org-b';
		mockSwitch.mockResolvedValue({ data: { token: 'new-access', refresh_token: 'new-refresh' } });

		expect(await syncTokenOrganization()).toBe(true);
		expect(mockSwitch).toHaveBeenCalledWith('org-b');
	});

	it('asks once for concurrent callers', async () => {
		mockSwitch.mockResolvedValue({ data: { token: 'new-access', refresh_token: 'new-refresh' } });

		await Promise.all([syncTokenOrganization('org-b'), syncTokenOrganization('org-b')]);

		expect(mockSwitch).toHaveBeenCalledTimes(1);
	});

	it.each([
		['answers null', () => mockSwitch.mockResolvedValue({ data: null })],
		['refuses', () => mockSwitch.mockRejectedValue(new Error('403'))]
	])('keeps the tokens, and does not ask again, when Gauzy %s', async (_label, arrange) => {
		arrange();

		expect(await syncTokenOrganization('org-b')).toBe(false);
		expect(await syncTokenOrganization('org-b')).toBe(false);

		expect(mockSwitch).toHaveBeenCalledTimes(1);
		expect(mockSet.access).not.toHaveBeenCalled();
	});

	it('asks nothing without a token or an organization', async () => {
		mockCookies.token = '';
		expect(await syncTokenOrganization('org-b')).toBe(false);
		mockCookies.token = token('org-a');
		expect(await syncTokenOrganization('')).toBe(false);

		expect(mockSwitch).not.toHaveBeenCalled();
	});
});
