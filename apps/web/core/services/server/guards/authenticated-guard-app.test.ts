/**
 * Every `app/api/*` route checks the caller's token against the Gauzy API through this guard. Routes called within
 * the same few seconds with the same token share one check; a refusal is never shared.
 */
const mockCurrentAuthenticatedUserRequest = jest.fn();

jest.mock('@/core/services/server/requests/auth', () => ({
	currentAuthenticatedUserRequest: (...args: unknown[]) => mockCurrentAuthenticatedUserRequest(...args)
}));

import { NextResponse } from 'next/server';
import {
	ACTIVE_TEAM_COOKIE_NAME,
	ORGANIZATION_ID_COOKIE_NAME,
	TENANT_ID_COOKIE_NAME,
	TOKEN_COOKIE_NAME
} from '@/core/constants/config/constants';
import { TAB_TEAM_HEADER } from '@/core/lib/auth/tab-team-header';
import { authenticatedGuard, sessionChecks } from './authenticated-guard-app';

const request = (token: string) =>
	new Request('http://localhost:3030/api/organization-team', {
		headers: { cookie: `${TOKEN_COOKIE_NAME}=${token}; ${TENANT_ID_COOKIE_NAME}=tenant-1` }
	});

const user = { id: 'user-1', employee: { id: 'employee-1' } };

describe('authenticatedGuard', () => {
	beforeEach(() => {
		sessionChecks.clear();
		mockCurrentAuthenticatedUserRequest.mockResolvedValue({ data: user });
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	it('checks the token once for routes called with it within the window', async () => {
		const first = await authenticatedGuard(request('token-a'), new NextResponse());
		const second = await authenticatedGuard(request('token-a'), new NextResponse());

		expect(mockCurrentAuthenticatedUserRequest).toHaveBeenCalledTimes(1);
		expect(mockCurrentAuthenticatedUserRequest).toHaveBeenCalledWith({
			bearer_token: 'token-a',
			signal: expect.any(AbortSignal)
		});
		expect(first.user).toEqual(user);
		expect(second.user).toEqual(user);
		expect(second.tenantId).toBe('tenant-1');
		expect(second.access_token).toBe('token-a');
	});

	it('checks another token on its own', async () => {
		await authenticatedGuard(request('token-a'), new NextResponse());
		await authenticatedGuard(request('token-b'), new NextResponse());

		expect(mockCurrentAuthenticatedUserRequest).toHaveBeenCalledTimes(2);
	});

	it('shares no refusal: the next route checks again', async () => {
		mockCurrentAuthenticatedUserRequest.mockResolvedValueOnce({ data: { statusCode: 401 } });

		const refused = await authenticatedGuard(request('token-a'), new NextResponse());
		const allowed = await authenticatedGuard(request('token-a'), new NextResponse());

		expect(refused.user).toBeNull();
		expect(refused.status).toBe(401);
		expect(allowed.user).toEqual(user);
		expect(mockCurrentAuthenticatedUserRequest).toHaveBeenCalledTimes(2);
	});

	it('checks afresh for a route that asks, whatever check it holds for the token', async () => {
		await authenticatedGuard(request('token-a'), new NextResponse());
		const fresh = await authenticatedGuard(request('token-a'), new NextResponse(), { fresh: true });

		expect(mockCurrentAuthenticatedUserRequest).toHaveBeenCalledTimes(2);
		expect(fresh.user).toEqual(user);
	});

	it('shares no outage: a check that failed is a 503 for its caller and is run again next time', async () => {
		mockCurrentAuthenticatedUserRequest.mockRejectedValueOnce(new Error('ECONNRESET'));

		const failed = await authenticatedGuard(request('token-a'), new NextResponse());
		const allowed = await authenticatedGuard(request('token-a'), new NextResponse());

		expect(failed.user).toBeNull();
		expect(failed.status).toBe(503);
		expect(allowed.user).toEqual(user);
		expect(mockCurrentAuthenticatedUserRequest).toHaveBeenCalledTimes(2);
	});
});

/**
 * Two tabs of one browser in two organizations (#5134): the cookies, shared by every tab, name the organization another
 * tab switched to. A tab still working in its own organization sends its own token and names its team.
 */
describe('authenticatedGuard, a tab working in its own organization', () => {
	/** An access token that decodes (only its payload is read). */
	const jwt = (organizationId: string, { userId = 'user-1', tenantId = 'tenant-1' } = {}) => {
		const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
		const issuedAt = Math.floor(Date.now() / 1000);
		return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id: userId, tenantId, organizationId, iat: issuedAt, exp: issuedAt + 3600 })}.sig`;
	};
	const sharedToken = jwt('org-b');
	const tabRequest = (authorization: string | null, tabTeamId?: string) =>
		new Request('http://localhost:3030/api/timer/stop', {
			headers: {
				cookie: `${TOKEN_COOKIE_NAME}=${sharedToken}; ${TENANT_ID_COOKIE_NAME}=tenant-1; ${ORGANIZATION_ID_COOKIE_NAME}=org-b; ${ACTIVE_TEAM_COOKIE_NAME}=team-b`,
				...(authorization ? { authorization: `Bearer ${authorization}` } : {}),
				...(tabTeamId ? { [TAB_TEAM_HEADER]: tabTeamId } : {})
			}
		});

	beforeEach(() => {
		sessionChecks.clear();
		mockCurrentAuthenticatedUserRequest.mockReset();
		mockCurrentAuthenticatedUserRequest.mockResolvedValue({ data: user });
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	it("acts with the tab's own token, its organization and its team", async () => {
		const tabToken = jwt('org-a');

		const guard = await authenticatedGuard(tabRequest(tabToken, 'team-a'), new NextResponse());

		expect(guard.access_token).toBe(tabToken);
		expect(guard.organizationId).toBe('org-a');
		expect(guard.teamId).toBe('team-a');
		// Gauzy is still asked whether that token is valid
		expect(mockCurrentAuthenticatedUserRequest).toHaveBeenCalledWith({
			bearer_token: tabToken,
			signal: expect.any(AbortSignal)
		});
	});

	it("never takes the other tab's team for it", async () => {
		const guard = await authenticatedGuard(tabRequest(jwt('org-a')), new NextResponse());

		expect(guard.organizationId).toBe('org-a');
		expect(guard.teamId).toBeUndefined();
	});

	it('acts with the cookies as before when the request carries their token', async () => {
		const guard = await authenticatedGuard(tabRequest(sharedToken, 'team-a'), new NextResponse());

		expect(guard.access_token).toBe(sharedToken);
		expect(guard.organizationId).toBe('org-b');
		expect(guard.teamId).toBe('team-b');
	});

	it("acts with the cookies when the request's token names their organization (an older token of the session)", async () => {
		const guard = await authenticatedGuard(tabRequest(jwt('org-b'), 'team-a'), new NextResponse());

		expect(guard.access_token).toBe(sharedToken);
		expect(guard.organizationId).toBe('org-b');
		expect(guard.teamId).toBe('team-b');
	});

	it("acts with the cookies when the request's token is another person's or another workspace's", async () => {
		const otherPerson = await authenticatedGuard(
			tabRequest(jwt('org-a', { userId: 'user-2' })),
			new NextResponse()
		);
		const otherWorkspace = await authenticatedGuard(
			tabRequest(jwt('org-a', { tenantId: 'tenant-2' })),
			new NextResponse()
		);

		expect(otherPerson.access_token).toBe(sharedToken);
		expect(otherWorkspace.access_token).toBe(sharedToken);
		expect(otherWorkspace.organizationId).toBe('org-b');
	});

	/** Another tab's switch wrote its organization and team, and its token is still on its way (CodeRabbit on #5321). */
	const midSwitchRequest = (authorization: string, tabTeamId?: string) =>
		new Request('http://localhost:3030/api/timer/stop', {
			headers: {
				cookie: `${TOKEN_COOKIE_NAME}=${jwt('org-a')}; ${TENANT_ID_COOKIE_NAME}=tenant-1; ${ORGANIZATION_ID_COOKIE_NAME}=org-b; ${ACTIVE_TEAM_COOKIE_NAME}=team-b`,
				authorization: `Bearer ${authorization}`,
				...(tabTeamId ? { [TAB_TEAM_HEADER]: tabTeamId } : {})
			}
		});

	it("acts in the tab's organization and team while another tab's switch moved the cookies ahead of the token", async () => {
		const sameToken = await authenticatedGuard(midSwitchRequest(jwt('org-a'), 'team-a'), new NextResponse());
		const olderToken = jwt('org-a').replace(/\.sig$/, '.older-sig');
		const ownOlderToken = await authenticatedGuard(midSwitchRequest(olderToken, 'team-a'), new NextResponse());

		expect(sameToken.organizationId).toBe('org-a');
		expect(sameToken.teamId).toBe('team-a');
		expect(sameToken.projectId).toBeUndefined();
		expect(ownOlderToken.access_token).toBe(olderToken);
		expect(ownOlderToken.organizationId).toBe('org-a');
		expect(ownOlderToken.teamId).toBe('team-a');
	});

	it('leaves the tab making the switch, which names no team of its own, on the cookies meanwhile', async () => {
		const guard = await authenticatedGuard(midSwitchRequest(jwt('org-a')), new NextResponse());

		expect(guard.organizationId).toBe('org-b');
		expect(guard.teamId).toBe('team-b');
	});

	it('ignores a team header that is not an id', async () => {
		const guard = await authenticatedGuard(tabRequest(jwt('org-a'), 'team a; drop'), new NextResponse());

		expect(guard.teamId).toBeUndefined();
	});
});

describe('authenticatedGuard, a tab bringing its organization back', () => {
	const jwt = (organizationId: string) => {
		const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
		const issuedAt = Math.floor(Date.now() / 1000);
		const payload = { id: 'user-1', tenantId: 'tenant-1', organizationId, iat: issuedAt, exp: issuedAt + 3600 };
		return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.sig-${organizationId}`;
	};

	beforeEach(() => {
		sessionChecks.clear();
		mockCurrentAuthenticatedUserRequest.mockReset();
		mockCurrentAuthenticatedUserRequest.mockResolvedValue({ data: user });
	});

	it("acts with the tab's token while the session's switch back to its organization is on its way", async () => {
		const tabToken = jwt('org-a');
		// The organization cookie already names the tab's organization; the session's token is still the other's
		const request = new Request('http://localhost:3030/api/timer/sync', {
			headers: {
				cookie: `${TOKEN_COOKIE_NAME}=${jwt('org-b')}; ${TENANT_ID_COOKIE_NAME}=tenant-1; ${ORGANIZATION_ID_COOKIE_NAME}=org-a`,
				authorization: `Bearer ${tabToken}`,
				[TAB_TEAM_HEADER]: 'team-a'
			}
		});

		const guard = await authenticatedGuard(request, new NextResponse());

		expect(guard.access_token).toBe(tabToken);
		expect(guard.organizationId).toBe('org-a');
		expect(guard.teamId).toBe('team-a');
	});
});
