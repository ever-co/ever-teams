/** @jest-environment jsdom */
/**
 * The presence a closing page reports goes out with this tab's own token while another tab has the cookies on another
 * organization (#5134). Once that token is gone, nothing goes out: without it the request would act with the cookies,
 * in the other organization (CodeRabbit on #5321).
 */
jest.mock('@/core/services/logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn() }) }
}));
jest.mock('@/core/services/logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));

import {
	setAccessTokenCookie,
	setActiveTeamIdCookie,
	setAuthCookies,
	setOrganizationIdCookie
} from '@/core/lib/helpers/cookies';
import { forgetTabAccessToken, rememberTabTeam, resetTabOrganizationState } from '@/core/lib/auth/tab-organization';
import { realtimeService } from './realtime.service';

/** An access token that decodes (only its payload is read). */
function token(organizationId: string) {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const issuedAt = Math.floor(Date.now() / 1000);
	const payload = { id: 'user-1', tenantId: 'tenant-1', organizationId, iat: issuedAt, exp: issuedAt + 3600 };
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature-${organizationId}`;
}

const TOKEN_A = token('org-a');

/** Tab A works in organization A; then tab B switches the shared cookies to organization B. */
function twoTabsInTwoOrganizations() {
	setAuthCookies({
		access_token: TOKEN_A,
		refresh_token: { token: 'refresh-a' },
		tenantId: 'tenant-1',
		teamId: 'team-a',
		organizationId: 'org-a',
		languageId: 'en',
		noTeamPopup: true,
		userId: 'user-1'
	} as never);
	rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
	setActiveTeamIdCookie('team-b');
	setOrganizationIdCookie('org-b');
	setAccessTokenCookie(token('org-b'));
}

const fetchMock = jest.fn();

beforeEach(() => {
	resetTabOrganizationState();
	fetchMock.mockReset();
	fetchMock.mockResolvedValue({ ok: true, status: 204 });
	globalThis.fetch = fetchMock as unknown as typeof fetch;
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('realtimeService.presenceOnUnload, in a tab working in its own organization', () => {
	it('reports with its own token and organization', () => {
		twoTabsInTwoOrganizations();

		realtimeService.presenceOnUnload('offline' as never);

		const headers = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
		expect(headers['Authorization']).toBe(`Bearer ${TOKEN_A}`);
		expect(headers['organization-id']).toBe('org-a');
	});

	it('reports nothing once its token for its organization is gone', () => {
		twoTabsInTwoOrganizations();
		forgetTabAccessToken(TOKEN_A);

		realtimeService.presenceOnUnload('offline' as never);

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
