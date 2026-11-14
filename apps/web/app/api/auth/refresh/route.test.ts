/**
 * The proxy-mode route the browser renews its session through: it gives Gauzy the refresh token and answers the new
 * pair. The browser must be able to tell a refresh token Gauzy refuses (the session ended, or another tab rotated the
 * token first) from a renewal that could not be made (Gauzy down). And a pair Gauzy has already rotated must reach the
 * browser, whatever happens next: its refresh token is the only one Gauzy accepts from then on.
 *
 * The route answered 500 "Token refresh failed" to every refusal, and dropped the new pair when the profile read
 * that follows the renewal failed.
 */
jest.mock('@/core/services/server/client-ip', () => ({ clientIpHeaders: async () => ({}) }));

import { POST } from './route';

type GauzyAnswer = { status: number; body: unknown } | 'unreachable' | 'hangs';

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
	jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
		const path = new URL(String(input)).pathname.replace(/^\/api/, '');
		const gauzyAnswer = gauzyAnswers[path];
		if (gauzyAnswer === 'hangs') {
			// No answer ever comes: only the caller's signal ends the wait
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
			});
		}
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

	it('answers the new pair even when the profile read that follows fails: Gauzy has already rotated the token', async () => {
		gauzyAnswers['/auth/refresh-token'] = { status: 200, body: { token: 'access-2', refresh_token: 'refresh-2' } };
		gauzyAnswers['/user/me'] = { status: 503, body: { statusCode: 503, message: 'Service Unavailable' } };

		const res = await renew();

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(expect.objectContaining({ token: 'access-2', refresh_token: 'refresh-2' }));
	});


	it('answers the new pair when the profile read never answers: the read gives up at its deadline', async () => {
		const deadlines: number[] = [];
		// The deadline passes at once, so the test does not wait five seconds
		jest.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
			deadlines.push(milliseconds);
			const controller = new AbortController();
			setTimeout(() => controller.abort(new DOMException('The read took too long', 'TimeoutError')), 10);
			return controller.signal;
		});
		gauzyAnswers['/auth/refresh-token'] = { status: 200, body: { token: 'access-2', refresh_token: 'refresh-2' } };
		gauzyAnswers['/user/me'] = 'hangs';

		const answer = await Promise.race([
			renew(),
			new Promise<'still waiting'>((resolve) => setTimeout(() => resolve('still waiting'), 1_000))
		]);

		expect(answer).not.toBe('still waiting');
		const res = answer as Response;
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ token: 'access-2', refresh_token: 'refresh-2' });
		expect(deadlines).toEqual([5_000]);
	});

	it('answers 502, not a refusal, when Gauzy says yes without a pair', async () => {
		gauzyAnswers['/auth/refresh-token'] = { status: 200, body: {} };

		const res = await renew();

		expect(res.status).toBe(502);
		expect(await res.json()).toEqual(expect.objectContaining({ statusCode: 502 }));
	});

	it.each([
		['a status that is no HTTP error status', { statusCode: 200, message: 'odd' }],
		['a status that is not a number', { statusCode: 'Unauthorized', message: 'odd' }],
		['no status, only a status text', { status: 'error', message: 'odd' }]
	])('answers 500 when the refusal body of Gauzy carries %s', async (_case, body) => {
		gauzyAnswers['/auth/refresh-token'] = { status: 503, body };

		const res = await renew();

		expect(res.status).toBe(500);
		expect(await res.json()).toEqual(expect.objectContaining({ statusCode: 500 }));
	});
});
