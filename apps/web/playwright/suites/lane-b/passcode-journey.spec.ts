import { expect, test } from '../../fixtures';
import { mockRequests } from '../../helpers';

import {
	askForCode,
	describeAppCalls,
	describeMockCutOff,
	describeMockLog,
	fieldError,
	fillCodeSlots,
	MOCK_EMAIL,
	mockAskedNoAuthPath,
	mockAskedNoNewAuthPath,
	mockAskAfterWaiting,
	mockAuthAskCount,
	mockCalls,
	mockCallsExactly,
	mockWasAskedExactly,
	SIGN_IN_CODE,
	watchedMockCall,
	watchMockCutOff,
	codeSlotValues,
	codeSlots,
	sessionCookies,
	watchMockApi,
	CODE_LENGTH
} from './lane-auth-helpers';

/** The mock-leg calls whose path is exactly `path` — `…/signin.email/confirm` contains `…/signin.email`. */
const mockLegCalls = (calls: ReturnType<typeof watchMockApi>, path: string) =>
	calls().filter((call) => call.path === path);

/**
 * The passwordless sign-in, end to end, against this lane's mock.
 *
 * `/auth/passcode` is the page this deployment opens by default (`DEFAULT_APP_PATH`, `NEXT_PUBLIC_DEMO` blank like
 * `apps/web/.env` and the Cypress run). The flow is three legs and the assertions name each one:
 *
 *   1. the browser asks **the mock directly**, and `watchMockApi` captures the body it sent;
 *   2. the mock's own request log, which is what `mockCalls*` answers: what the fake Gauzy holds afterwards;
 *   3. the browser's jar, which is where a session would appear (`auth-token` and its family).
 *
 * ⚠ Leg 1 used to be written as "the browser asks this app's own route handler", and the 2026-11-21 run red-flagged
 * three cases for it. **There is no such leg in a mock run.** Every sign-in method of
 * `core/services/client/api/auth/auth.service.ts` branches on `GAUZY_API_BASE_SERVER_URL.value` — which
 * `playwright/test-servers.ts:109` sets to this lane's mock — and takes the direct branch: `signInEmail` posts
 * `/auth/signin.email` (lines 179-185), `signInEmailConfirm` `/auth/signin.email/confirm` (201-212) and
 * `signInWithEmailAndCode`, the hook's attempt 2, posts `/auth/login` (136-142). axios adds the `/api` segment
 * (`core/services/client/axios.ts:110`), so what leaves the browser is `POST <mock origin>/api/auth/signin.email`,
 * which is also exactly how the mock's log records it. The three reds read as that explains: `Received array: []`
 * beside a capture of nothing but NextAuth's own chatter — `GET /api/auth/session → 200, GET /api/health → 200,
 * POST /api/log → 201, …` (`lane-b-verify.log` lines 522-627). `app/api/auth/signin-email`, `…-confirm` and
 * `app/api/auth/login` belong to a *proxy* deployment; the only way this lane reaches them is calling the handlers
 * directly, which is what `route-refusals.spec.ts` does.
 *
 * Selectors and copy are taken from the components that render them: `core/components/pages/auth/sign-in/
 * credentials-step.tsx` (`#passcode-email`, the `Send me a code` submit), `code-step.tsx` (`#passcode-code-label`,
 * the `Sign in` submit, the `role="alert"` error line), `core/components/auth/kit/auth-code-field.tsx` (8 slots in a
 * `fieldset` labelled by `#passcode-code-label`) and `core/hooks/auth/use-authentication-passcode.ts` (which request
 * each button makes, and which answers it shows).
 */
test.describe('lane-b · the passwordless sign-in journey', () => {
	test('asking for a code sends it straight to the API with this app\'s branding, and opens the code step with the address in it', async ({
		anon,
		shield
	}) => {
		const view = await anon('/auth/passcode');
		const calls = watchMockApi(view);

		await askForCode(view, MOCK_EMAIL);

		// Leg 1: what left the browser, and with what body. `authService.signInEmail`'s direct branch
		// (`auth.service.ts:179-185`) sends `signInCodeRequestBody(email)` = the address plus `appEmailBranding()` and
		// `appMagicSignUrl` (`auth.service.ts:34-37`), so the e-mail the mock was asked to send is this app's own.
		// awaited, because the answer lands after the click: `watchedMockCall` in `lane-auth-helpers.ts`.
		const sent = await watchedMockCall(calls, '/api/auth/signin.email');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the sign-in page never sent a code request to the API: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		expect(sent[0].method, `the code request was ${sent[0].method}, not a POST`).toBe('POST');
		expect(
			(sent[0].body as { email?: string })?.email,
			`the address the API was asked to send a code to is not the one typed: ${JSON.stringify(sent[0].body)}`
		).toBe(MOCK_EMAIL);
		expect(
			(sent[0].body as { appMagicSignUrl?: string })?.appMagicSignUrl,
			`the code request no longer carries this app's own sign-in link, so the e-mail would not open this app: ${JSON.stringify(sent[0].body)}`
		).toContain('/auth/passcode');
		expect(
			sent[0].status,
			`the API answered the code request with ${sent[0].status}; a 400 here means the address was refused before the code step`
		).toBe(200);

		// Leg 2: what the mock recorded, matching leg 1 one-for-one. `/api/auth/signin.email` exactly — the confirm
		// path contains it.
		const asked = await mockWasAskedExactly('/api/auth/signin.email');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`asking for a code asked the mock ${asked.length} times, once expected: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);

		// What the person is shown next, and what it promises.
		await expect(
			view.locator('#passcode-code-label'),
			'the code step did not open: its "Sign-in code" label is not on the page'
		).toBeVisible();
		const slots = codeSlots(view);
		expect(await slots.count(), `the code field shows ${await slots.count()} slots, not ${CODE_LENGTH}`).toBe(
			CODE_LENGTH
		);
		await expect(
			view.getByText(new RegExp(`We sent an ${CODE_LENGTH}-character code`)),
			`the code step does not say an ${CODE_LENGTH}-character code was sent`
		).toBeVisible();
		await expect(
			view.getByText(MOCK_EMAIL, { exact: true }).first(),
			`the code step does not name the address the code was sent to (${MOCK_EMAIL})`
		).toBeVisible();

		// Leg 3: nothing of a session exists yet — only a code was asked for.
		expect(await sessionCookies(view.context()), 'asking for a sign-in code already wrote session cookies').toEqual(
			[]
		);
		expect(shield.pageErrors(), 'uncaught errors during the code request').toEqual([]);
	});

	test('an address that is not an address is refused on the field, and the mock is never asked at all', async ({
		anon
	}) => {
		const view = await anon('/auth/passcode');
		const calls = watchMockApi(view);

		await view.locator('#passcode-email').fill('not-an-email');
		await view.getByRole('button', { name: 'Send me a code' }).click();

		await expect(fieldError(view, 'passcode-email'), 'no error line appeared under the address field').toBeVisible();
		await expect(
			fieldError(view, 'passcode-email'),
			'the address refusal does not name the address as the problem'
		).toContainText('properly formatted email');
		await expect(view.locator('#passcode-email'), 'a refused address was given aria-invalid').toHaveAttribute(
			'aria-invalid',
			'true'
		);

		// Still the first step: the code step never opened.
		await expect(
			view.getByRole('button', { name: 'Send me a code' }),
			'the page moved on to the code step although the address is not an address'
		).toBeVisible();

		expect(
			calls().filter((call) => call.path.startsWith('/api/auth/signin') || call.path === '/api/auth/login'),
			`a malformed address still reached the API: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoAuthPath();
	});

	test('the code typed is the code the app asks the API to confirm, and the refusal is shown where the code was typed', async ({
		anon
	}) => {
		const view = await anon('/auth/passcode');
		const calls = watchMockApi(view);
		const cutOff = watchMockCutOff(view);
		await askForCode(view, MOCK_EMAIL);

		await fillCodeSlots(view, SIGN_IN_CODE);
		await view.getByRole('button', { name: 'Sign in', exact: true }).click();

		// Leg 1: the typed code is what left the browser. Attempt 1 of `verifySignInEmailConfirmRequest`
		// (`core/hooks/auth/use-authentication-passcode.ts:176-206`) is `authService.signInEmailConfirm`, whose direct
		// branch (`auth.service.ts:201-212`) posts `/auth/signin.email/confirm` with `{ email, code, includeTeams:true }`
		// — no password, because this is the passwordless flow.
		const confirm = mockLegCalls(calls, '/api/auth/signin.email/confirm');
		expect(
			confirm.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the code was never sent to the API for confirmation: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		const body = (confirm[0].body ?? {}) as { email?: string; code?: string; password?: string };
		expect(body.code, `the code the API was asked to confirm is not the one typed (${SIGN_IN_CODE})`).toBe(
			SIGN_IN_CODE
		);
		expect(body.email, `the code was confirmed for another address: ${JSON.stringify(body)}`).toBe(MOCK_EMAIL);
		expect(
			'password' in body,
			`the passwordless confirmation carried a password: ${JSON.stringify(Object.keys(body))}`
		).toBe(false);

		// Leg 2: attempt 1 as the mock recorded it. The mock echoes the body, so the confirmation carries no user and no
		// workspaces and signs nobody in — which is what makes the hook run attempt 2 at all (pinned below, on the
		// browser side, because the mock never sees it).
		const confirmed = await mockWasAskedExactly('/api/auth/signin.email/confirm');
		expect(
			confirmed.map((request) => `${request.method} ${request.path} → ${request.status}`),
			'the mock was never asked to confirm the code'
		).toHaveLength(1);
		// Attempt 2 — `signInWithEmailAndCode` (`auth.service.ts:136-142`), the invite-code leg. Measured twice
		// 2026-11-22, and the two readings only agree once the witness is *waited for*:
		// - `lane-b-passcode-journey-3.log` read the mock's log once, straight after the confirmation, and got nothing
		//   for it while the browser watcher still held the ask open: `POST /api/auth/login → (no answer yet)` against
		//   `Mock log: POST /api/auth/signin.email → 200, POST /api/auth/signin.email/confirm → 200`.
		// - `lane-b-passcode-journey-4.log`, waiting up to 10 s for the same entry, recorded
		//   `POST /api/auth/login → 200` from the mock.
		// Same page, same click, one reading too early — the race `watchedMockCall` exists for, on the mock's own log
		// side. It is not a mock gap either: this lane's mock was asked the same path directly and answered it in 2 ms
		// (`curl -X POST 127.0.0.1:3996/api/auth/login -d '{"email":"manager@example.test","code":"AB12CD34"}'` →
		// `{"method":"POST","path":"/api/auth/login","status":200}` in its own `/requests` log). So the pin is the
		// answered ask, exactly once, carrying the typed code — plus an empty cut-off witness, so that the day this
		// really is a cut-off the case says so instead of quietly matching the earlier reading.
		const servedLogin = await mockAskAfterWaiting('/api/auth/login', { tries: 40, intervalMs: 500 });
		expect(
			servedLogin.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the hook's second attempt never reached the mock. Mock log: ${describeMockLog(
				await mockRequests()
			)}; browser side: ${describeAppCalls(calls())}; cut off: ${describeMockCutOff(
				cutOff()
			)} (attempt 2 is \`queryCall\` = authService.signInWithEmailAndCode, use-authentication-passcode.ts:219-221 → auth.service.ts:136-142)`
		).toEqual(['POST /api/auth/login → 200']);

		const loginCall = calls().find((call) => call.path === '/api/auth/login');
		const loginBody = (loginCall?.body ?? {}) as { email?: string; code?: string; password?: string };
		expect(loginBody.code, `the retry asked the API with code ${JSON.stringify(loginBody.code)}, not the code typed (${SIGN_IN_CODE}): ${JSON.stringify(loginBody)}`).toBe(
			SIGN_IN_CODE
		);
		expect(loginBody.email, `the retry asked the API for address ${JSON.stringify(loginBody.email)}, not ${MOCK_EMAIL}: ${JSON.stringify(loginBody)}`).toBe(
			MOCK_EMAIL
		);
		expect(
			'password' in loginBody,
			`the retry carried a password, which the passwordless flow does not have: ${JSON.stringify(Object.keys(loginBody))}`
		).toBe(false);

		expect(
			cutOff()
				.filter((entry) => entry.path === '/api/auth/login')
				.map((entry) => `${entry.method} ${entry.path} ${entry.failure}`),
			`the retry was reported cut off although the mock answered it (${servedLogin.map((request) => `${request.method} ${request.path} → ${request.status}`).join(', ')}): ${describeMockCutOff(
				cutOff()
			)}`
		).toEqual([]);
		expect(
			await mockCalls('/api/invite/validate-by-code'),
			`the browser's leg asked the app's own invitation-code check, which it does not have: ${describeMockLog(await mockRequests())}`
		).toEqual([]);

		// The code is not a session: the mock answers every POST it does not know by echoing the body, so it cannot
		// hand out a token. The app then reports the code as invalid — which is the honest end of this journey, and
		// what pins the shape of the flow. PLAN.md names this as the mock's limit.
		await expect(
			fieldError(view, 'passcode-code'),
			`the app did not report the code as refused. The mock was asked: ${describeMockLog(await mockRequests())}`
		).toContainText('Invalid code', { timeout: 20_000 });

		// Leg 3: a refused code wrote no session.
		expect(
			await sessionCookies(view.context()),
			'a code the API never granted still wrote session cookies'
		).toEqual([]);
		await expect(
			view,
			'the page left the sign-in after a refused code'
		).toHaveURL(/\/auth\/passcode/);
	});

	test('a code shorter than the 8 the app asks for never leaves the browser — and the page says nothing about it', async ({
		anon
	}) => {
		const view = await anon('/auth/passcode');
		const calls = watchMockApi(view);
		await askForCode(view, MOCK_EMAIL);
		// The code request `askForCode` just made is counted out, so "nothing left the browser" means nothing *new*.
		const asksBefore = await mockAuthAskCount();

		// The field itself only takes 8 slots, so a short code is 5 slots filled and 3 left empty.
		const slots = codeSlots(view);
		for (let index = 0; index < 5; index += 1) await slots.nth(index).fill('A');
		// Read the slots *before* the submit as well. `lane-b-passcode-journey-3.log` measured `Expected: "AAAAA" /
		// Received: "AAAA"` for this assertion, which on its own cannot say whether the refusal dropped a character or
		// whether the five `fill()` calls never put five characters in (each slot auto-advances focus, so a `fill()` can
		// land on a slot the component has already moved). Both readings are in the message below, so whichever way the
		// next run goes, the cause is named with it.
		const typedBeforeClick = await codeSlotValues(view);
		expect(
			typedBeforeClick,
			`the five slots did not hold the five characters typed (they read ${JSON.stringify(typedBeforeClick)}): the code field is ${CODE_LENGTH} one-character slots, so this half is how the case types, not what the app refuses`
		).toBe('AAAAA');
		await view.getByRole('button', { name: 'Sign in', exact: true }).click();
		await view.waitForTimeout(1_000);
		const typedAfterClick = await codeSlotValues(view);

		// Neither leg of the confirmation happened: the browser sent no confirmation to the API, and the mock's log
		// holds no new sign-in ask on top of the code request.
		expect(
			calls().filter((call) => call.path === '/api/auth/signin.email/confirm' || call.path === '/api/auth/login'),
			`a ${5}-character code still left the browser: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);

		// REAL DEFECT, asserted as it is, and read straight off the two functions: `handleCodeSubmit`
		// (`core/hooks/auth/use-authentication-passcode.ts:323-343`) puts the hook in status 'loading' at line 326, then
		// runs `authFormValidate(['email','code'])` at 339 and on an invalid form only `setErrors(errors); return;` —
		// the status is never moved to 'error'. `codeErrorOf` (`core/components/pages/auth/sign-in/code-step.tsx:29-35`)
		// returns `null` unless `form.status === 'error'`, so the errors are stored and never shown: the person who
		// typed too little is told nothing at all. This assertion pins that silence; a fix that shows the reason fails
		// it, on purpose. (It held in the 2026-11-21 run too — that case died two assertions later, on the slots.)
		await expect(
			fieldError(view, 'passcode-code'),
			'a too-short code was refused without any message under the code field'
		).toHaveCount(0);
		await expect(
			view.locator('#passcode-code-label'),
			'a too-short code left the code step; the person should still be on it'
		).toBeVisible();
		await expect(
			typedAfterClick,
			`a too-short code was cleared or changed by the refusal; it should stay as the person typed it. Five slots were filled and read "${typedBeforeClick}" before the click and "${typedAfterClick}" after it, so the character went missing ${
				typedBeforeClick === 'AAAAA'
					? 'in the refusal, which is the app doing this'
					: 'before any submit, which is how the slots were filled, not the app'
			}`
		).toBe('AAAAA');
	});

	test('the link in the e-mail (?email=&code=) fills the slots and asks for the confirmation by itself', async ({
		anon
	}) => {
		const view = await anon(`/auth/passcode?email=${MOCK_EMAIL}&code=${SIGN_IN_CODE}`);
		const calls = watchMockApi(view);

		// The hook reads the query on mount (`use-authentication-passcode.ts`) and confirms it; `code-step.tsx`
		// `codeFromAddressBar()` fills the slots from the same query and submits the form once they are full.
		await expect(
			view.locator('#passcode-code-label'),
			'a sign-in link with an address and a code did not open the code step'
		).toBeVisible({ timeout: 20_000 });

		const filled = await codeSlotValues(view);
		expect(filled, `the code from the link did not reach the slots (slots hold "${filled}")`).toBe(SIGN_IN_CODE);

		const confirms = mockLegCalls(calls, '/api/auth/signin.email/confirm');
		expect(
			confirms.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the sign-in link never sent its code to the API: ${describeAppCalls(calls())}`
		).not.toHaveLength(0);
		for (const confirmation of confirms) {
			expect(
				(confirmation.body as { code?: string })?.code,
				`a confirmation carried ${JSON.stringify((confirmation.body as { code?: string })?.code)}, not the code from the link`
			).toBe(SIGN_IN_CODE);
			expect(
				(confirmation.body as { email?: string })?.email,
				`a confirmation was sent for another address: ${JSON.stringify(confirmation.body)}`
			).toBe(MOCK_EMAIL);
		}

		const confirmations = await mockCallsExactly('/api/auth/signin.email/confirm');
		expect(
			confirmations.length,
			`the mock was asked to confirm the linked code ${confirmations.length} times; the hook confirms the query once and the filled field submits once, so at least one is expected`
		).toBeGreaterThanOrEqual(1);

		// The address the link carried is kept for the next attempt (`ever-teams-start-email`).
		const kept = await view.evaluate(() => window.localStorage.getItem('ever-teams-start-email'));
		expect(kept, `the address from the sign-in link was not kept for the next attempt (localStorage holds ${JSON.stringify(kept)})`).toBe(
			MOCK_EMAIL
		);

		expect(await sessionCookies(view.context()), 'a sign-in link whose code was refused wrote session cookies').toEqual(
			[]
		);
	});

	test('a code that is already on its way cannot be asked for again, and the page says so with its cooldown', async ({
		anon
	}) => {
		const view = await anon('/auth/passcode');
		const calls = watchMockApi(view);
		const asks = () => calls().filter((call) => call.path === '/api/auth/signin.email').length;

		await askForCode(view, MOCK_EMAIL);

		const first = await mockCallsExactly('/api/auth/signin.email');
		expect(first.length, `asking for a code asked the mock ${first.length} times`).toBe(1);
		// The same moment from the browser side, so a second ask can be placed on one side or the other of the click.
		const asksBeforeClick = asks();

		// `ResendCode` starts its 60 s cooldown locked (code-step.tsx passes `startLocked`, a code just went out).
		const resend = view.getByRole('button', { name: /New code in|Send a new code/ });
		await expect(
			resend,
			'the resend line is not on the code step'
		).toBeVisible();
		await expect(
			resend,
			'the resend is not locked although a code just went out'
		).toHaveAttribute('aria-disabled', 'true');

		// Four seconds with nobody touching the page. Added 2026-11-22 because `lane-b-passcode-probe-2.log` recorded
		// "1 code request left the page before the click and 2 after it", and that alone cannot tell a click from a
		// page that re-asks by itself. If this line goes red, the claim below is not measurable at all.
		await view.waitForTimeout(4_000);
		const asksIdle = asks();
		expect(
			asksIdle,
			`the code step asked for another code on its own, with nobody clicking: ${describeAppCalls(
				calls()
			)} — until this stops, nothing in this case can blame or clear the resend button`
		).toBe(asksBeforeClick);

		// `dispatchEvent`, not `click()`: the locked button carries a `CooldownRing` that ticks every second, so
		// Playwright's stability check made an ordinary `click()` here eat ~60 s of the 180 s test budget
		// (`lane-b-passcode-journey-1.log`: this case at 1.1m, `lane-b-passcode-probe-2.log` the same). What is under
		// test is the button's click handler, and `dispatchEvent('click')` calls exactly that.
		await resend.dispatchEvent('click');
		await view.waitForTimeout(1_000);

		const after = await mockCallsExactly('/api/auth/signin.email');
		expect(
			after.length,
			`clicking a locked resend asked the mock again (${after.length} asks: ${after
				.map((request) => `${request.method} ${request.path} → ${request.status}`)
				.join(', ')}). Browser side: ${asksBeforeClick} code request(s) left the page before the click, ${asksIdle} after 4 s of idle, ${asks()} after the click (${describeAppCalls(
				calls()
			)}). The button's own guard is resend() → if (isLocked) return, core/components/auth/kit/resend-code.tsx:75-78`
		).toBe(1);
	});

	test('going back from the code step keeps the address the person typed', async ({ anon }) => {
		const view = await anon('/auth/passcode');
		await askForCode(view, MOCK_EMAIL);

		await view.getByRole('button', { name: 'Use another e-mail' }).click();

		await expect(
			view.locator('#passcode-email'),
			'"Use another e-mail" did not bring back the address step'
		).toBeVisible();
		await expect(
			view.locator('#passcode-email'),
			'going back from the code step lost the address that was typed'
		).toHaveValue(MOCK_EMAIL);
	});
});
