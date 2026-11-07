/**
 * Every `app/api/*` route checks the caller's token against the Gauzy API through this guard. Routes called within
 * the same few seconds with the same token share one check; a refusal is never shared.
 */
const mockCurrentAuthenticatedUserRequest = jest.fn();

jest.mock('@/core/services/server/requests/auth', () => ({
	currentAuthenticatedUserRequest: (...args: unknown[]) => mockCurrentAuthenticatedUserRequest(...args)
}));

import { NextResponse } from 'next/server';
import { TENANT_ID_COOKIE_NAME, TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
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
