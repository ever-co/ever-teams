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
function token(organizationId: string | null, userId = 'user-1', issuedAt = Math.floor(Date.now() / 1000)) {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const payload = { id: userId, organizationId, iat: issuedAt, exp: issuedAt + 3600 };
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
		// setActiveTeam writes the organization cookie before it asks for the switch
		mockCookies.organizationId = 'org-b';
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
		mockCookies.organizationId = 'org-b';
		mockSwitch.mockResolvedValue({ data: { token: 'new-access', refresh_token: 'new-refresh' } });

		await Promise.all([syncTokenOrganization('org-b'), syncTokenOrganization('org-b')]);

		expect(mockSwitch).toHaveBeenCalledTimes(1);
	});

	it.each([
		['refuses the membership (401, proxy mode)', { response: { status: 401 } }],
		['refuses the permission (403, proxy mode)', { response: { status: 403 } }],
		['refuses the permission (403, direct mode ApiErrorService)', { httpResponseStatus: 403 }]
	])('keeps the tokens, and does not ask again, when Gauzy %s', async (_label, shape) => {
		mockCookies.organizationId = 'org-b';
		mockSwitch.mockRejectedValue(Object.assign(new Error('refused'), shape));

		expect(await syncTokenOrganization('org-b')).toBe(false);
		expect(await syncTokenOrganization('org-b')).toBe(false);

		expect(mockSwitch).toHaveBeenCalledTimes(1);
		expect(mockSet.access).not.toHaveBeenCalled();
	});

	it('asks on its own for a token that changed while a switch was pending', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockSwitch.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));

		mockCookies.organizationId = 'org-b';
		const first = syncTokenOrganization('org-b');
		// Another user signed in (another tab) before the first answer arrived: their switch is not the first one
		mockCookies.token = token('org-a', 'user-2');
		mockSwitch.mockResolvedValueOnce({ data: { token: 'user-2-access', refresh_token: 'user-2-refresh' } });
		const second = syncTokenOrganization('org-b');
		answer({ data: { token: 'user-1-access', refresh_token: 'user-1-refresh' } });

		expect(await first).toBe(false);
		expect(await second).toBe(true);
		expect(mockSwitch).toHaveBeenCalledTimes(2);
		expect(mockSet.access).toHaveBeenCalledTimes(1);
		expect(mockSet.access).toHaveBeenCalledWith('user-2-access');
	});

	it('asks again with a new token after a refusal (an expired token is refused with 401 too)', async () => {
		mockCookies.organizationId = 'org-b';
		mockSwitch.mockRejectedValueOnce(Object.assign(new Error('refused'), { response: { status: 401 } }));
		expect(await syncTokenOrganization('org-b')).toBe(false);

		// The token was refreshed: the refusal was for the old one
		mockCookies.token = token('org-a', 'user-1', Math.floor(Date.now() / 1000) + 60);
		mockSwitch.mockResolvedValueOnce({ data: { token: 'new-access', refresh_token: 'new-refresh' } });
		expect(await syncTokenOrganization('org-b')).toBe(true);
		expect(mockSwitch).toHaveBeenCalledTimes(2);
	});

	it.each([
		['answers null', () => mockSwitch.mockResolvedValueOnce({ data: null })],
		['is unreachable', () => mockSwitch.mockRejectedValueOnce(new Error('Network Error'))],
		[
			'fails (502)',
			() => mockSwitch.mockRejectedValueOnce(Object.assign(new Error('bad'), { response: { status: 502 } }))
		]
	])('keeps the tokens but asks again later when Gauzy %s', async (_label, arrange) => {
		mockCookies.organizationId = 'org-b';
		arrange();
		expect(await syncTokenOrganization('org-b')).toBe(false);

		mockSwitch.mockResolvedValueOnce({ data: { token: 'new-access', refresh_token: 'new-refresh' } });
		expect(await syncTokenOrganization('org-b')).toBe(true);
		expect(mockSwitch).toHaveBeenCalledTimes(2);
	});

	it('drops a late answer when the user chose another organization meanwhile', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockSwitch.mockReturnValue(new Promise((resolve) => (answer = resolve)));

		mockCookies.organizationId = 'org-b';
		const switching = syncTokenOrganization('org-b');
		// Back on a team of organization A before B's answer arrives
		mockCookies.organizationId = 'org-a';
		answer({ data: { token: 'b-access', refresh_token: 'b-refresh' } });

		expect(await switching).toBe(false);
		expect(mockSet.access).not.toHaveBeenCalled();
		expect(mockSet.organization).not.toHaveBeenCalled();
	});

	it('drops an answer that arrives after another user signed in', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockSwitch.mockReturnValue(new Promise((resolve) => (answer = resolve)));

		mockCookies.organizationId = 'org-b';
		const switching = syncTokenOrganization('org-b');
		// Another tab signed in as someone else, in the same organization, before the answer arrived
		mockCookies.token = token('org-a', 'user-2');
		answer({ data: { token: 'b-access', refresh_token: 'b-refresh' } });

		expect(await switching).toBe(false);
		expect(mockSet.access).not.toHaveBeenCalled();
		expect(mockSet.refresh).not.toHaveBeenCalled();
	});

	it('asks nothing without a token or an organization', async () => {
		mockCookies.token = '';
		expect(await syncTokenOrganization('org-b')).toBe(false);
		mockCookies.token = token('org-a');
		expect(await syncTokenOrganization('')).toBe(false);

		expect(mockSwitch).not.toHaveBeenCalled();
	});
});
