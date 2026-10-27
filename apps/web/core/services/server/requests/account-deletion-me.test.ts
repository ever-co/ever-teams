/**
 * Proxy-mode signed-in account deletion (app/api/account-deletion/me): the caller's token and tenant from its cookies,
 * Gauzy's status answered as it is.
 */
const mockGuard = jest.fn();
jest.mock('../guards/authenticated-guard-app', () => ({ authenticatedGuard: (...args: unknown[]) => mockGuard(...args) }));
jest.mock('../client-ip', () => ({ clientIpHeaders: jest.fn(async () => ({})) }));

import { NextResponse } from 'next/server';
import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { proxyAccountDeletionMe } from './account-deletion-me';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
	global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
	global.fetch = originalFetch;
});

const signedIn = {
	$res: (data: unknown) => NextResponse.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1'
};

function request(method: 'GET' | 'POST') {
	return new Request('https://app.ever.team/api/account-deletion/me', { method });
}

describe('proxyAccountDeletionMe', () => {
	it('GET forwards the token and tenant and answers the preview', async () => {
		mockGuard.mockResolvedValueOnce(signedIn);
		const preview = { email: 'j***@example.com', expiresAt: '', accounts: [{ workspace: 'Acme', outcome: 'workspace-deleted' }] };
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(preview), { status: 200 }));

		const res = await proxyAccountDeletionMe('GET', request('GET'));

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual(preview);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`${GAUZY_API_SERVER_URL}/account-deletion/me`);
		expect(init.method).toBe('GET');
		expect(init.body).toBeUndefined();
		expect(init.headers.authorization).toBe('Bearer access-token');
		expect(init.headers['tenant-id']).toBe('tenant-1');
	});

	it('POST sends { confirm: true } and passes a 403 through', async () => {
		mockGuard.mockResolvedValueOnce(signedIn);
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Forbidden resource' }), { status: 403 }));

		const res = await proxyAccountDeletionMe('POST', request('POST'));

		expect(res.status).toBe(403);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ confirm: true });
	});

	it('answers the guard refusal without calling Gauzy for a caller without a session', async () => {
		mockGuard.mockResolvedValueOnce({
			$res: (message: unknown) => NextResponse.json({ statusCode: 401, message }, { status: 401 }),
			user: null
		});

		const res = await proxyAccountDeletionMe('POST', request('POST'));

		expect(res.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
