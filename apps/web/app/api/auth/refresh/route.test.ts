/**
 * The proxy-mode route the browser renews its session through: it gives Gauzy the refresh token and answers the new
 * pair. The browser must be able to tell a refresh token Gauzy refuses (the session ended, or another tab rotated the
 * token first) from a renewal that could not be made (Gauzy down).
 *
 * The route answered 500 "Token refresh failed" to every refusal.
 */
jest.mock('@/core/services/server/client-ip', () => ({ clientIpHeaders: async () => ({}) }));

import { POST } from './route';

type GauzyAnswer = { status: number; body: unknown } | 'unreachable';

let gauzyAnswers: Record<string, GauzyAnswer>;

function renew(refresh_token = 'refresh-token-1') {
	return POST(
		new Request('https://teams.example.org/api/auth/refresh', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token })
		})
	);
}

beforeEach(() => {
	gauzyAnswers = {};
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	// Gauzy, as the server-side requests reach it
	jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const path = new URL(String(input)).pathname.replace(/^\/api/, '');
		const gauzyAnswer = gauzyAnswers[path];
		if (!gauzyAnswer || gauzyAnswer === 'unreachable') {
			throw new TypeError('fetch failed');
		}
		return new Response(JSON.stringify(gauzyAnswer.body), {
			status: gauzyAnswer.status,
			headers: { 'content-type': 'application/json' }
		});
	});
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('POST /api/auth/refresh', () => {
	it('answers the new pair', async () => {
		gauzyAnswers['/auth/refresh-token'] = { status: 200, body: { token: 'access-2', refresh_token: 'refresh-2' } };
		gauzyAnswers['/user/me'] = { status: 200, body: { id: 'user-1' } };

		const res = await renew();

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ user: { id: 'user-1' }, token: 'access-2', refresh_token: 'refresh-2' });
	});

	it.each(['Token is rotated', 'jwt expired', 'Token is revoked'])(
		'answers 401 with the reason when Gauzy refuses the refresh token (%s)',
		async (reason) => {
			gauzyAnswers['/auth/refresh-token'] = { status: 401, body: { statusCode: 401, message: reason } };

			const res = await renew();

			expect(res.status).toBe(401);
			expect(await res.json()).toEqual(expect.objectContaining({ statusCode: 401, message: reason }));
		}
	);

	it('answers an error that is not a refusal when Gauzy cannot be reached', async () => {
		gauzyAnswers['/auth/refresh-token'] = 'unreachable';

		const res = await renew();

		expect(res.status).toBeGreaterThanOrEqual(500);
	});
});
