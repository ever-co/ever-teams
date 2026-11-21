import { expect, test, type ApiCall } from '../../api-fixtures';
import { mockReset } from '../../helpers';

/**
 * `POST /api/auth/refresh`: the renewal of a session, and the statuses the browser acts on.
 *
 * The browser sends its refresh token in the body; this route exchanges it at the API and answers with the new
 * pair. Every status here decides what the person's session does next, which is why the route's own comments
 * spell them out and why they are worth pinning:
 *
 * - 400 — the request had nothing to renew, and the API was never asked;
 * - 200 with the pair — even when the profile read after the renewal fails, because the API has already rotated
 *   the tokens and the browser must leave with the new pair;
 * - 502 — the API said yes and sent no token: a broken answer, not a refusal of the refresh token;
 * - 500 — the API could not be reached or failed, which the browser must read as "try again", never as "this
 *   session is over". Only an HTTP status the API actually answered is passed through as is.
 *
 * The mock answers `/api/auth/refresh-token` with a placeholder pair for anything, and with a readable synthetic
 * JWT for `synthetic-new-workspace-refresh` — the one the new-workspace flow uses, and the one the
 * `newWorkspaceRefreshFails` switch makes the API unable to answer.
 */

const REFRESH = '/api/auth/refresh';

async function refresh(api: ApiCall, refresh_token?: string) {
	const response = await api(REFRESH, { method: 'POST', body: { refresh_token }, anonymous: true });
	const status = response.status();
	return { status, body: await response.json().catch(() => null), headers: response.headers() };
}

test.describe('renewing a session', () => {
	test('a request with nothing to renew is answered here, and the API is never asked', async ({ api, mock }) => {
		// A request that carries no JSON at all is a different case, and a worse one: the route does
		// `await req.json()` without catching it, so it throws and the server answers 500. That one is pinned by
		// suites/api/empty-body.spec.ts; here the request is well formed and simply has nothing to renew.
		for (const [what, body] of [
			['an empty string', ''],
			['one character, which is not a token', 'x'],
			['only whitespace', '   ']
		] as const) {
			const { status, body: answer } = await refresh(api, body);

			expect(status, `a refresh request with ${what} answered ${status} instead of 400`).toBe(400);
			expect(
				answer?.errors?.refresh_token,
				`a refresh with ${what} was not answered with the reason`
			).toBeTruthy();
		}
		expect(await mock.requests(), 'an invalid refresh request reached the API').toEqual([]);
	});

	test('the renewal answers the new pair and the person it belongs to', async ({ api, ids, mock }) => {
		const { status, body } = await refresh(api, 'synthetic-refresh-token');

		expect(status, `the renewal answered ${status}: ${JSON.stringify(body)}`).toBe(200);
		expect(body?.token, 'the renewal sent no access token').toBeTruthy();
		expect(body?.refresh_token, 'the renewal sent no refresh token, so the old one is now spent').toBeTruthy();
		expect(body?.user?.id, 'the renewal did not say whose session this is').toBe(ids.user);

		const asked = await mock.calls('/api/auth/refresh-token');
		expect(
			asked.map((call) => `${call.method} ${call.path}`),
			'the API was not asked to renew'
		).toEqual(['POST /api/auth/refresh-token']);
	});

	test('a profile read that cannot finish does not cost the person the pair the API already rotated', async ({
		api,
		mock
	}) => {
		// The route gives the profile read 5 s (PROFILE_READ_DEADLINE_MS) and answers the pair whatever it gives,
		// because the API has already rotated the refresh token: without the new pair in hand, the browser's next
		// renewal is refused and the session ends on a slow profile read.
		await mock.scenario({ delays: { '/api/user/me': 6_000 } });

		const { status, body } = await refresh(api, 'synthetic-refresh-token');

		expect(status, `a slow profile read turned the renewal into ${status}`).toBe(200);
		expect(body?.token, 'the pair was withheld because the profile read failed').toBeTruthy();
		expect(
			body?.refresh_token,
			'the rotated refresh token was withheld because the profile read failed'
		).toBeTruthy();

		// `AUDIT.md` finding 14, the tail `suites/lane-c/session-check.spec.ts:220-223` uses for the same reason:
		// the mock is still holding `GET /api/user/me` open when this test ends, and `api-fixtures` resets before
		// each test — so an answer that lands *after* the next test's reset lands in that test's evidence. Outlast
		// the armed 6 s hold (the app stopped waiting at 5 s), then throw the log away.
		await new Promise((done) => setTimeout(done, 1_500));
		await mockReset();
	});

	test('an API that cannot answer is not reported to the browser as a refusal', async ({ api, mock }) => {
		// 401 would make the client end a session whose refresh token may still be good. Only a status the API
		// actually answered travels through; "no answer" and "an answer without one" are a 500 to try again.
		await mock.scenario({ newWorkspaceRefreshFails: true });

		const { status, body } = await refresh(api, 'synthetic-new-workspace-refresh');

		expect(status, `an API that failed the renewal answered ${status}`).toBe(500);
		expect(status, 'a failure of the API was reported as a refusal of the refresh token').not.toBe(401);
		expect(body?.statusCode, 'the answer does not name its status').toBe(500);
		expect(
			(await mock.calls('/api/auth/refresh-token')).map((call) => `${call.method} ${call.path} ${call.status}`),
			'the API was not asked, or answered something else'
		).toEqual(['POST /api/auth/refresh-token 500']);
	});

	test('the renewal is authenticated by the token in the body, not by the browser’s cookies', async ({ api }) => {
		// Documented in the route: it returns data and the client keeps the cookies. Two things follow, and both
		// are worth seeing — the route reads no session cookie, so an anonymous request renews a session just as
		// well, and it sets none either, so no response ever puts a session cookie somewhere a client did not ask.
		const { status, headers } = await refresh(api, 'synthetic-refresh-token');

		expect(status, 'a renewal without cookies was refused').toBe(200);
		const setCookie = headers['set-cookie'] ?? '';
		expect(setCookie, `the renewal set cookies the client does not expect: ${setCookie}`).not.toContain(
			'auth-token'
		);
		expect(setCookie, `the renewal set cookies the client does not expect: ${setCookie}`).not.toContain(
			'auth-refresh-token'
		);
	});
});
