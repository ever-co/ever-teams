/**
 * Proxy-mode account deletion routes (app/api/account-deletion/{request,verify,confirm}): forward only the expected
 * fields to Gauzy, and answer with Gauzy's own status — the confirm page tells a dead link (410) from a failure.
 */
jest.mock('../client-ip', () => ({ clientIpHeaders: jest.fn(async () => ({ 'X-Ever-Client-IP': '203.0.113.7' })) }));

import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { proxyAccountDeletion } from './account-deletion';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
	global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
	global.fetch = originalFetch;
});

function post(body: unknown) {
	return new Request('https://app.ever.team/api/account-deletion/x', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function gauzyAnswers(status: number, body: unknown) {
	fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

function forwarded(): { url: string; init: RequestInit & { headers: Record<string, string> } } {
	const [url, init] = fetchMock.mock.calls[0];
	return { url, init };
}

describe('proxyAccountDeletion', () => {
	it('forwards a request with its expected string fields only, and the client IP headers', async () => {
		gauzyAnswers(202, { status: 'accepted' });

		const res = await proxyAccountDeletion(
			'request',
			post({
				email: ' jane@example.com ',
				callbackUrl: 'https://app.ever.team/delete-account/confirm',
				locale: 'fr',
				appName: 'Ever Teams',
				tenantId: 'not-forwarded',
				admin: true
			})
		);

		expect(res.status).toBe(202);
		expect(res.headers.get('cache-control')).toBe('no-store');
		await expect(res.json()).resolves.toEqual({ status: 'accepted' });
		const { url, init } = forwarded();
		expect(url).toBe(`${GAUZY_API_SERVER_URL}/account-deletion/request`);
		expect(init.method).toBe('POST');
		expect(init.headers['X-Ever-Client-IP']).toBe('203.0.113.7');
		expect(JSON.parse(String(init.body))).toEqual({
			email: 'jane@example.com',
			callbackUrl: 'https://app.ever.team/delete-account/confirm',
			locale: 'fr',
			appName: 'Ever Teams'
		});
	});

	it('passes the 410 of a dead link through, unchanged', async () => {
		const gone = { message: 'This link is invalid or has expired. Request a new one.' };
		gauzyAnswers(410, gone);

		const res = await proxyAccountDeletion('verify', post({ token: 'tok' }));

		expect(res.status).toBe(410);
		await expect(res.json()).resolves.toEqual(gone);
		expect(JSON.parse(String(forwarded().init.body))).toEqual({ token: 'tok' });
	});

	it('always sends confirm: true with the token on confirm', async () => {
		gauzyAnswers(200, { deleted: true, accounts: 2, workspacesDeleted: 1 });

		const res = await proxyAccountDeletion('confirm', post({ token: 'tok', confirm: false }));

		expect(res.status).toBe(200);
		expect(JSON.parse(String(forwarded().init.body))).toEqual({ token: 'tok', confirm: true });
	});

	it('answers 400 without calling Gauzy when the required field is missing', async () => {
		const res = await proxyAccountDeletion('confirm', post({ confirm: true }));

		expect(res.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('answers 502 when Gauzy cannot be reached', async () => {
		fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

		const res = await proxyAccountDeletion('request', post({ email: 'jane@example.com' }));

		expect(res.status).toBe(502);
	});
});
