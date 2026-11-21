import { expect, test } from '../../api-fixtures';
import { mockRequests, receivedTokens } from '../../helpers';

import {
	describeMockLog,
	mockCallsExactly,
	MOCK_EMAIL,
	mockAskedNothing,
	SIGN_IN_CODE
} from './lane-auth-helpers';

/**
 * The sign-in routes as handlers, with no browser in the loop.
 *
 * Every browser suite in this repo drives these flows through a form, so what a *handler* refuses on its own is
 * unowned (audit finding 12). The distinction that only the mock's request log can prove is kept explicit in every
 * case below: **refused here** (the mock's log stays empty) versus **forwarded** (the mock was asked). A handler that
 * forwards a bad body to the API and echoes its answer is a different bug from one that refuses it, and only the log
 * tells them apart.
 *
 * The handlers, all under `app/api/auth/`:
 *   signin-email            `authFormValidate(['email'])`            → 400 `{ errors }`
 *   signin-email-password   `validateForm(['email','password'])`     → 400 `{ errors }`
 *   signin-email-confirm    `authFormValidate(['email','code'])`     → 400 `{ errors }`, *before* the invite-code check
 *   register                `authFormValidate(['email','name','team'])` → 400 `{ errors }` — its comment calls this
 *                           400 "load-bearing": `useAuthenticationTeam` reads `errors` only on status 400
 *   request-password        `authFormValidate(['email'])`            → 400 `{ errors }`
 *   reset-password          token/password/confirmation all present  → 400 `{ message }`
 *   verify/resend-link      `refuseForeignOrigin` first, then `authenticatedGuard`
 *   refresh                 no token on the body → 400 `{ errors }`; a token the API answers without a pair → 502,
 *                           deliberately not 401 (`app/api/auth/refresh/route.ts`)
 *   send-code               `authFormValidate(['email'])` → **200** carrying `{ errors }`, the shape the register
 *                           route's comment says it was fixed for. It is a sibling of the route the passcode page
 *                           really uses (`/api/auth/signin-email`); there is no `/api/auth/passcode` handler.
 *   login                   `authFormValidate(['email','code'])` → **200** carrying `{ errors }` as well; a
 *                           well-formed code is taken for an accepted invitation and the branch reads a field the
 *                           mock's echo never sends (§5).
 *
 * `core/services/server/same-origin-request.ts` refuses on `Sec-Fetch-Site: cross-site` **and** `same-site` — the
 * `same-site` case is what a sibling subdomain actually sends, and the audit counts it tested on 3 of 286 guarded
 * entries, so it is pinned here for a sign-in-adjacent route.
 *
 * **The mock's log spells every path with this app's `/api` prefix**, and every filter below matches that spelling.
 * `serverFetch` fetches `GAUZY_API_SERVER_URL + path` (`core/services/server/fetch.ts`) and that constant is
 * `basePath + '/api'` (`core/constants/config/constants.tsx`), so a handler asking for `/auth/signin.email` arrives at
 * the mock as `/api/auth/signin.email` — measured 2026-11-21 on this lane (`POST /api/auth/signin-email` on 3032, then
 * `GET http://127.0.0.1:3998/requests` → `[{"method":"POST","path":"/api/auth/signin.email","status":200}]`). A filter
 * without the prefix matches nothing, which is why the 2026-11-21 run red-flagged four cases whose forwarding the app
 * really did (`lane-b-verify.log` lines 950-1120: `Received array: []` beside a log line naming the ask), and made the
 * `mockAskedNothing` witnesses below pass for the wrong reason. The mock's own handlers are keyed the same way
 * (`cypress/support/mock-gauzy-server.mjs`: `pathname === '/api/user/me'`, `pathname === '/api/auth/refresh-token'`).
 */
const CROSS_SITE = { 'sec-fetch-site': 'cross-site' };
const SAME_SITE = { 'sec-fetch-site': 'same-site' };

test.describe('lane-b · the sign-in routes refuse on their own, and say so before the API is asked', () => {
	test('POST /api/auth/signin-email refuses a body whose address is not an address, and never asks the API', async ({
		api
	}) => {
		const response = await api('/api/auth/signin-email', { method: 'POST', body: { email: 'nope@nope' } });
		const body = (await response.json()) as { errors?: Record<string, string> };

		expect(response.status(), `a malformed address was answered ${response.status()}, not 400: ${JSON.stringify(body)}`).toBe(
			400
		);
		expect(
			body.errors?.email,
			`the 400 does not name the address as the problem: ${JSON.stringify(body)}`
		).toContain('properly formatted email address');

		// Refused here: the mock never saw the ask.
		expect(
			await mockRequests(),
			`the handler forwarded a body it should have refused: ${describeMockLog(await mockRequests())}`
		).toEqual([]);
	});

	test('POST /api/auth/signin-email with a well-formed address is forwarded, once, on Gauzy’s own path', async ({
		api
	}) => {
		const response = await api('/api/auth/signin-email', { method: 'POST', body: { email: MOCK_EMAIL } });

		expect(response.status(), `a valid code request was answered ${response.status()}: ${await response.text()}`).toBe(
			200
		);
		const asked = await mockCallsExactly('/api/auth/signin.email');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`this app did not forward a valid code request exactly once: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
		expect(asked[0].method, `the code request reached the API as ${asked[0].method}, not a POST`).toBe('POST');
	});

	test('POST /api/auth/signin-email-password refuses a one-character password before the API sees a credential', async ({
		api
	}) => {
		const response = await api('/api/auth/signin-email-password', {
			method: 'POST',
			body: { email: MOCK_EMAIL, password: 'x', includeTeams: true }
		});
		const body = (await response.json()) as { errors?: Record<string, string> };

		expect(
			response.status(),
			`a one-character password was answered ${response.status()}, not 400: ${JSON.stringify(Object.keys(body))}`
		).toBe(400);
		expect(
			body.errors?.password,
			`the password refusal is not the general empty-field message: ${JSON.stringify(body.errors)}`
		).toContain('fill out this field');

		await mockAskedNothing('/api/auth/signin.email.password');
	});

	test('POST /api/auth/signin-email-confirm refuses a short code before it is tried as an invitation code', async ({
		api
	}) => {
		const response = await api('/api/auth/signin-email-confirm', {
			method: 'POST',
			body: { email: MOCK_EMAIL, code: 'AB12' }
		});
		const body = (await response.json()) as { errors?: Record<string, string> };

		expect(response.status(), `a 4-character code was answered ${response.status()}, not 400: ${JSON.stringify(body)}`).toBe(
			400
		);
		expect(
			body.errors?.code,
			`the code refusal does not name the 8 the API asks for: ${JSON.stringify(body.errors)}`
		).toContain('8 characters');

		// The handler checks the invitation code first, so an empty log proves the refusal happened before it.
		await mockAskedNothing('/api/invite/validate-by-code');
		await mockAskedNothing('/api/auth/signin.email/confirm');
	});

	test('POST /api/auth/register answers 400 with the field errors, which is the only status the client reads', async ({
		api
	}) => {
		// `app/api/auth/register/route.ts`: "A 400 here is load-bearing: useAuthenticationTeam only reads `errors` on
		// status 400. This route used to answer 200 with { errors } … the real reason never shown."
		const response = await api('/api/auth/register', {
			method: 'POST',
			body: { name: 'X', email: 'nope@nope', team: '' }
		});
		const body = (await response.json()) as { errors?: Record<string, string> };

		expect(response.status(), `an invalid sign-up was answered ${response.status()}: ${JSON.stringify(body)}`).toBe(400);
		expect(
			Object.keys(body.errors ?? {}).sort(),
			`the 400 names these fields as broken, not all three: ${JSON.stringify(body.errors)}`
		).toEqual(['email', 'name', 'team']);
		expect(body.errors?.name, `the name refusal is not the valid-name message: ${JSON.stringify(body.errors)}`).toContain(
			'valid Name'
		);
		expect(body.errors?.team, `the team refusal is not the valid-team message: ${JSON.stringify(body.errors)}`).toContain(
			'valid Team Name'
		);

		await mockAskedNothing('/api/auth/register');
	});

	test('POST /api/auth/request-password and /api/auth/reset-password refuse an incomplete body without asking the API', async ({
		api
	}) => {
		const forgot = await api('/api/auth/request-password', { method: 'POST', body: { email: '' } });
		const forgotBody = await forgot.json();
		expect(
			forgot.status(),
			`an empty reset-link request was answered ${forgot.status()}, not 400: ${JSON.stringify(forgotBody)}`
		).toBe(400);
		await mockAskedNothing('/api/auth/request-password');

		const reset = await api('/api/auth/reset-password', {
			method: 'POST',
			body: { token: '', password: 'Str0ng!Pass', confirmPassword: 'Str0ng!Pass' }
		});
		const resetBody = (await reset.json()) as { message?: string };
		expect(
			reset.status(),
			`a reset request without a token was answered ${reset.status()}, not 400: ${JSON.stringify(resetBody)}`
		).toBe(400);
		expect(
			resetBody.message,
			`the reset refusal does not say what was missing: ${JSON.stringify(resetBody)}`
		).toContain('required');
		await mockAskedNothing('/api/auth/reset-password');
	});

	test('POST /api/auth/reset-password with everything asked for is forwarded on Gauzy’s own path', async ({ api }) => {
		const token = 'lane-b-route-level-token';
		const response = await api('/api/auth/reset-password', {
			method: 'POST',
			body: { token, password: 'Str0ng!Pass', confirmPassword: 'Str0ng!Pass' }
		});

		expect(
			response.status(),
			`a complete reset request was answered ${response.status()}: ${await response.text()}`
		).toBe(200);
		const asked = await mockCallsExactly('/api/auth/reset-password');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the mock was never asked to reset: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);

		// The mock answers a POST it has no handler for by echoing the body it got
		// (`cypress/support/mock-gauzy-server.mjs`: `if (method !== 'GET') return body ?? { success: true };`), so the
		// token below is a witness that this app forwarded the body unchanged. Measured 2026-11-21: this request was
		// answered `{"token":"lane-b-route-level-token","password":"Str0ng!Pass","confirmPassword":"Str0ng!Pass"}`.
		const echoed = (await response.json()) as { token?: string };
		expect(
			echoed.token,
			`the forwarded body is not what the API was handed: ${JSON.stringify(echoed)}`
		).toBe(token);
	});

	test('POST /api/auth/verify/resend-link refuses same-site as firmly as cross-site, and asks the API neither', async ({
		api
	}) => {
		for (const [why, headers] of [
			['cross-site (another site made the request)', CROSS_SITE],
			['same-site (a sibling subdomain made the request)', SAME_SITE]
		] as const) {
			const response = await api('/api/auth/verify/resend-link', { method: 'POST', body: {}, headers });
			const body = (await response.json()) as { statusCode?: number; message?: string };

			expect(
				response.status(),
				`a ${why} resend was not refused with 403: ${JSON.stringify(body)}`
			).toBe(403);
			expect(
				body.message,
				`the ${why} refusal is not the guard's own message: ${JSON.stringify(body)}`
			).toContain('Cross-site request refused');
		}

		// Both refusals happen before `authenticatedGuard` and before any Gauzy call. Measured 2026-11-21: `HTTP 403`
		// with `{"statusCode":403,"message":"Cross-site request refused"}`.
		await mockAskedNothing('/api/auth/email/verify/resend-link');
		await mockAskedNothing('/api/user/me');
	});

	test('POST /api/auth/verify/resend-link with no cookies is relayed, because this mock hands /api/user/me to anybody', async ({
		api
	}) => {
		/**
		 * What the 2026-11-21 run called a 401-vs-200 red, measured on a healthy lane on 2026-11-21 (no cookies, no
		 * `Sec-Fetch-Site` header): `HTTP 200` with `{"email":"manager@example.test","appName":"Ever Teams",…}` — the
		 * mock's echo of what this app sent it — and the mock log
		 * `GET /api/user/me → 200, POST /api/auth/email/verify/resend-link → 200`, with `receivedTokens` empty.
		 *
		 * The chain, read from the source: `authenticatedGuard` calls `currentAuthenticatedUserRequest({ bearer_token: '' })`
		 * (`core/services/server/guards/authenticated-guard-app.ts`) and counts the answer as authenticated unless it is a
		 * 2xx body carrying `statusCode 401`; this mock answers `if (pathname === '/api/user/me') return data.baseUser`
		 * (`cypress/support/mock-gauzy-server.mjs`) whoever asks, with no bearer to look at. So the guard finds the fixture
		 * user, `user.email` is `manager@example.test`, and the resend is forwarded. **Verdict: the mock cannot answer "the
		 * API refuses a caller with no session"** (PLAN.md §8) — no lane of this harness can show the 401 the real API's
		 * `/user/me` would give. What this case pins instead is the half that is real here: the app asked for the session
		 * check with **no bearer token at all**, and then relayed the answer it got.
		 */
		const response = await api('/api/auth/verify/resend-link', { method: 'POST', body: {}, anonymous: true });
		const body = (await response.json()) as { email?: string; appEmailConfirmationUrl?: string };

		expect(
			response.status(),
			`the relay of a session-less resend is no longer what this lane measured (${response.status()}: ${JSON.stringify(body)})`
		).toBe(200);
		expect(
			body.email,
			`the relayed resend no longer carries the user the guard's bearer-less /api/user/me check handed it: ${JSON.stringify(body)}`
		).toBe(MOCK_EMAIL);

		const sessionCheck = await mockCallsExactly('/api/user/me');
		expect(sessionCheck.length, `the guard did not check the session at all: ${describeMockLog(await mockRequests())}`).toBe(
			1
		);
		expect(
			await receivedTokens('/api/user/me'),
			`the session check carried a bearer token after all, so this was not the cookie-less request this pins: ${JSON.stringify(
				await receivedTokens('/api/user/me')
			)}`
		).toEqual([]);
		expect(
			await mockCallsExactly('/api/auth/email/verify/resend-link'),
			`the resend was not forwarded after that answer: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
	});

	test('POST /api/auth/refresh refuses a body with no refresh token before the API is asked to rotate one', async ({
		api
	}) => {
		const response = await api('/api/auth/refresh', { method: 'POST', body: { refresh_token: '' } });
		const body = (await response.json()) as { errors?: Record<string, string> };

		expect(
			response.status(),
			`a refresh request with no token was answered ${response.status()}, not 400: ${JSON.stringify(body)}`
		).toBe(400);
		expect(
			body.errors?.refresh_token,
			`the 400 does not name the refresh token as the problem: ${JSON.stringify(body)}`
		).toContain('refresh token must be provided');

		await mockAskedNothing('/api/auth/refresh-token');
	});

	test('POST /api/auth/refresh rotates on this mock, because the mock does answer the refresh path with a pair', async ({
		api
	}) => {
		/**
		 * This is the 2026-11-21 red "expected 502, received 200", and the red was the test's, not the app's.
		 *
		 * The case assumed — in its title and in its comment — that this mock "has no handler for `/auth/refresh-token`
		 * and answers it by echoing the request body, so its answer really carries no `token`". It has one, and it hands
		 * out a pair: `cypress/support/mock-gauzy-server.mjs`
		 * `if (pathname === '/api/auth/refresh-token') return { token: 'synthetic-refreshed-token', refresh_token:
		 * 'synthetic-refresh-token' };`. Measured on this lane 2026-11-21 (`POST /api/auth/refresh` with
		 * `{"refresh_token":"lane-b-pinned-refresh-token"}`): `HTTP 200` with `{"user":{…Fixture Manager…}, …}`, and the
		 * mock log `POST /api/auth/refresh-token → 200, GET /api/user/me → 200` (the profile read the route does after a
		 * renewal).
		 *
		 * So the route's deliberate 502 branch (`if (!refreshResult?.data?.token)` → `{ message: 'Token refresh failed:
		 * No token received', statusCode: 502 }`, `app/api/auth/refresh/route.ts`) is **unreachable in a mock run**: the
		 * mock always sends the pair. That gap is written to PLAN.md §8 for the mock's owner (an answer *without* a token,
		 * switchable), and it is not something a lane may fake with a `page.route` stub. What this case pins is the half
		 * the lane can prove: the renewal is asked on Gauzy's own path, the pair reaches the browser, and the route does
		 * **not** answer 401 — which is the point the 502 comment makes, kept as a pin because a 401 here would end a
		 * session whose refresh token may still be good.
		 */
		const response = await api('/api/auth/refresh', {
			method: 'POST',
			body: { refresh_token: 'lane-b-pinned-refresh-token' }
		});
		const body = (await response.json()) as { token?: string; refresh_token?: string; statusCode?: number };

		expect(
			response.status(),
			`the renewal was not answered with the pair this mock hands out (${response.status()}: ${JSON.stringify(body)})`
		).toBe(200);
		expect(
			body.token,
			`the pair the mock handed out did not reach this app's answer: ${JSON.stringify(body)}`
		).toBe('synthetic-refreshed-token');
		expect(
			body.statusCode,
			`a renewal that succeeded carries a Gauzy error status: ${JSON.stringify(body)}`
		).toBeUndefined();
		// The refusal the 502 branch was written to avoid: whatever this lane can reach, a rotated token is never
		// answered as a refused session.
		expect(response.status(), 'a successful renewal was answered 401, which ends a session on a bad answer').not.toBe(
			401
		);

		const asked = await mockCallsExactly('/api/auth/refresh-token');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the app never asked the API to rotate the token: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
	});

	test('POST /api/auth/send-code carries its field errors on a 200 — the very shape the register route says it fixed', async ({
		api
	}) => {
		// REAL DEFECT, asserted as it is. `app/api/auth/send-code/route.ts` ends its refusal with
		// `return NextResponse.json({ errors });` — no status — while `signin-email` answers the same invalid body with
		// `{ errors }, { status: 400 }`. `app/api/auth/register/route.ts` carries a comment calling its own 400
		// "load-bearing" because `useAuthenticationTeam` reads `errors` only on status 400; a client doing that against
		// this route never sees the reason. The pin fails the day someone adds the status, and then says so.
		const response = await api('/api/auth/send-code', { method: 'POST', body: { email: 'nope@nope' } });
		const body = (await response.json()) as { errors?: Record<string, string> };

		expect(
			response.status(),
			`this route now refuses a bad address with ${response.status()} instead of answering 200 with errors — the defect was fixed, so update this pin and say so`
		).toBe(200);
		expect(
			body.errors?.email,
			`the 200 carried no field error, so the shape being pinned is gone: ${JSON.stringify(body)}`
		).toContain('properly formatted email address');

		await mockAskedNothing('/api/auth/send-code');
	});

	test('the passcode page’s own route is /api/auth/signin-email, and /api/auth/send-code can never say an account is missing', async ({
		api
	}) => {
		// Two things the audit's wording blurs, pinned from the code: `use-authentication-passcode.ts` sends the code
		// through `authService.signInEmail`, which in proxy mode posts `/api/auth/signin-email`
		// (`core/services/client/api/auth/auth.service.ts`) — there is no `/api/auth/passcode` handler in this app at
		// all (`ls apps/web/app/api/auth/` and `find apps/web/app/api -iname '*passcode*'` both say so). The sibling
		// route `/api/auth/send-code` (which `authService.sendAuthCode` uses, and which no client code in apps/web
		// calls) answers a valid address through the mock, which has no handler for it and echoes the body — so its
		// own "We couldn't find any account associated to this email" branch is unreachable in a mock run: every
		// address looks sendable.
		const send = await api('/api/auth/send-code', { method: 'POST', body: { email: MOCK_EMAIL } });
		expect(
			send.status(),
			`the send-code route did not answer a valid address (${send.status()}: ${await send.text()})`
		).toBe(200);
		const askedOfSend = await mockCallsExactly('/api/auth/send-code');
		expect(
			askedOfSend.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`send-code did not reach the platform API, so its "no such account" answer is no longer unreachable-by-mock: ${describeMockLog(
				await mockRequests()
			)}`
		).toHaveLength(1);

		const signIn = await api('/api/auth/signin-email', { method: 'POST', body: { email: MOCK_EMAIL } });
		expect(
			signIn.status(),
			`the route the passcode page actually uses answered a valid address ${signIn.status()}: ${await signIn.text()}`
		).toBe(200);
		const askedOfSignIn = await mockCallsExactly('/api/auth/signin.email');
		expect(
			askedOfSignIn.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the passcode page's own path was not forwarded exactly once: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
	});

	test('POST /api/auth/login answers its own validation errors on a 200 too, and asks the platform API nothing', async ({
		api
	}) => {
		// REAL DEFECT, same shape as `send-code` above: `app/api/auth/login/route.ts` ends with
		// `return NextResponse.json({ errors });`. The route is the second attempt of the passcode form's code submit
		// (`use-authentication-passcode.ts`, attempt 2 = the invite-code route), so this is the answer a person can get
		// when the code they typed is too short — on a 200.
		const response = await api('/api/auth/login', { method: 'POST', body: { email: MOCK_EMAIL, code: 'AB12' } });
		const body = (await response.json()) as { errors?: Record<string, string> };

		expect(
			response.status(),
			`this route now refuses a short code with ${response.status()} instead of answering 200 with errors — the defect was fixed, so update this pin and say so`
		).toBe(200);
		expect(
			body.errors?.code,
			`the 200 carried no code error, so the shape being pinned is gone: ${JSON.stringify(body)}`
		).toContain('8 characters');

		await mockAskedNothing('/api/invite/validate-by-code');
		await mockAskedNothing('/api/auth/verify-code');
	});

	test("POST /api/auth/login crashes on the mock's echo of an invitation code — predicted from the code, §5", async ({
		api
	}) => {
		// Predicted from the source in PLAN.md §5 before it was seen, and **confirmed** on this lane: 2026-11-21,
		// `POST /api/auth/login` with `{"email":"manager@example.test","code":"AB12CD34"}` → `HTTP 500` with an empty
		// body, and the mock log held exactly one ask: `POST /api/invite/validate-by-code → 200` (no
		// `/auth/verify-code` ask at all — the crash is in the invite branch, before the auth-code branch is reached).
		// `app/api/auth/login/route.ts` asks
		// `verifyInviteCodeRequest` first (`POST /invite/validate-by-code`), treats a `response.ok` without a
		// `response.statusCode` as an accepted invitation, and then reads `inviteReq.data.fullName.split(' ')`. This
		// mock has no handler for that path and answers it by echoing the request body (`{ email, code }`), so the
		// branch is entered with an answer that has no `fullName` — a TypeError on a route that is not wrapped in a
		// try/catch. That is why no mock run can ever exercise the invitation branch of a typed code: the mock makes
		// every code look like a valid invitation and then withholds the field the branch reads.
		const response = await api('/api/auth/login', {
			method: 'POST',
			body: { email: MOCK_EMAIL, code: SIGN_IN_CODE }
		});

		expect(
			response.status(),
			`this answered ${response.status()}, not the 500 the invite branch predicts; whatever it really does is what the pin must become: ${(await response.text()).slice(0, 200)}`
		).toBe(500);

		const inviteChecks = await mockCallsExactly('/api/invite/validate-by-code');
		expect(
			inviteChecks.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the invitation check was not the single ask this pin describes: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
		await mockAskedNothing('/api/auth/verify-code');
	});
});

test.describe('lane-b · a POST with no guard at all, pinned as it is today', () => {
	test('POST /api/organization-team-join relays an anonymous, foreign body to the platform API with no session and no origin check', async ({
		api
	}) => {
		// AUDIT FINDING 1, pinned as it is. `app/api/organization-team-join/route.ts`: its GET calls
		// `authenticatedGuard`, its POST calls neither that nor `refuseForeignOrigin`/`refuseForeignWrite`, and
		// `requestToJoinRequest` (`core/services/server/requests/request-to-join-team.ts`) posts the body straight on
		// with no bearer token. This test is meant to FAIL the day someone adds a guard — that is what a pin is for.
		//
		const sentinel = { organizationTeamId: 'lane-b-pinned-team', email: 'someone@example.test' };

		const response = await api('/api/organization-team-join', {
			method: 'POST',
			body: sentinel,
			anonymous: true,
			headers: CROSS_SITE
		});
		const body = (await response.json()) as Record<string, unknown>;

		expect(
			response.status(),
			`the handler refused the request (${response.status()}) — a guard has been added, so update this pin and say so`
		).toBe(200);

		/**
		 * The sentinel witness is gone, and here is why it cannot exist in a mock run. This case expected the mock's
		 * echo (`if (method !== 'GET') return body ?? { success: true };`) and so `body.organizationTeamId`; the mock has
		 * a **handler** for this exact path before that fallback — `cypress/support/mock-gauzy-server.mjs`,
		 * `if (pathname === '/api/organization-team-join') return pagination([]);` — so the answer this app gives back is
		 * the mock's own empty page. Measured 2026-11-21: `HTTP 200` with `{"items":[],"total":0}`, and the mock log
		 * `[{"method":"POST","path":"/api/organization-team-join","status":200}]` with `receivedTokens` empty.
		 *
		 * The relay is therefore pinned the way a mock run can pin it: the ask the platform API really got, as a POST,
		 * and the absence of any bearer with it. A body witness needs the mock's owner to answer this path with the body
		 * it received (PLAN.md §8) — not a stub in a lane.
		 */
		expect(
			body,
			`the mock no longer answers this path with its empty page, so the witness below needs re-reading: ${JSON.stringify(body)}`
		).toEqual({ items: [], total: 0 });

		const asked = await mockCallsExactly('/api/organization-team-join');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the platform API was not asked, so the relay is no longer what was pinned: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
		expect(
			asked[0].method,
			`the relay arrived at the API as ${asked[0].method}, not a POST`
		).toBe('POST');

		// And with nothing authenticating it: the mock records the sha256 of every Bearer token it received, per path.
		expect(
			await receivedTokens('/api/organization-team-join'),
			`a bearer token was forwarded after all, so the request was not the anonymous one this pins: ${JSON.stringify(
				await receivedTokens('/api/organization-team-join')
			)}`
		).toEqual([]);
	});

	test('the same unguarded POST is relayed whatever Sec-Fetch-Site says, because no guard reads it', async ({ api }) => {
		// The contrast case for the guard tests above: `refuseForeignWrite` would refuse these, and this route never
		// calls it. Pinned so the day it starts calling it, this fails loudly instead of quietly.
		for (const fetchSite of ['cross-site', 'same-site', 'none'] as const) {
			const response = await api('/api/organization-team-join', {
				method: 'POST',
				body: { organizationTeamId: `lane-b-${fetchSite}`, email: 'someone@example.test' },
				anonymous: true,
				headers: { 'sec-fetch-site': fetchSite }
			});

			expect(
				response.status(),
				`a POST with Sec-Fetch-Site: ${fetchSite} was refused with ${response.status()} — a guard now covers this route`
			).toBe(200);
		}
	});
});
