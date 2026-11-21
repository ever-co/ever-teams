import { expect, test } from '../../fixtures';
import { mockRequests } from '../../helpers';

import {
	askForCode,
	appAuthAsks,
	appCallsMatching,
	describeAppCalls,
	describeMockLog,
	fieldError,
	fillCodeSlots,
	MOCK_EMAIL,
	mockAskedNoAuthPath,
	mockCalls,
	mockCallsExactly,
	mockWasAskedExactly,
	SIGN_IN_CODE,
	codeSlotValues,
	codeSlots,
	sessionCookies,
	watchAppApi,
	CODE_LENGTH
} from './lane-auth-helpers';

/**
 * The passwordless sign-in, end to end, against this lane's mock.
 *
 * `/auth/passcode` is the page this deployment opens by default (`DEFAULT_APP_PATH`, `NEXT_PUBLIC_DEMO` blank like
 * `apps/web/.env` and the Cypress run). The flow is three legs and the assertions name each one:
 *
 *   1. the browser asks this app's own route handler (`POST /api/auth/signin-email` / `…/signin-email-confirm`),
 *      and `watchAppApi` captures the body it sent — the mock never sees that leg;
 *   2. that handler asks the mock (`POST /auth/signin.email`, `POST /auth/signin.email/confirm`, and an invite-code
 *      check `POST /invite/validate-by-code` before the confirmation), which is what `mock.*` answers;
 *   3. the browser's jar, which is where a session would appear (`auth-token` and its family).
 *
 * Selectors and copy are taken from the components that render them: `core/components/pages/auth/sign-in/
 * credentials-step.tsx` (`#passcode-email`, the `Send me a code` submit), `code-step.tsx` (`#passcode-code-label`,
 * the `Sign in` submit, the `role="alert"` error line), `core/components/auth/kit/auth-code-field.tsx` (8 slots in a
 * `fieldset` labelled by `#passcode-code-label`) and `core/hooks/auth/use-authentication-passcode.ts` (which request
 * each button makes, and which answers it shows).
 */
test.describe('lane-b · the passwordless sign-in journey', () => {
	test('asking for a code asks this app, which asks the mock, and opens the code step with the address in it', async ({
		anon,
		shield
	}) => {
		const view = await anon('/auth/passcode');
		const calls = watchAppApi(view);

		await askForCode(view, MOCK_EMAIL);

		// Leg 1: what the browser asked this app, and with what.
		const sent = appCallsMatching(calls(), '/api/auth/signin-email');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the sign-in page never asked this app to send a code: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		expect(sent[0].method, `the code request was ${sent[0].method}, not a POST`).toBe('POST');
		expect(
			(sent[0].body as { email?: string })?.email,
			`the address the app was asked to send a code to is not the one typed: ${JSON.stringify(sent[0].body)}`
		).toBe(MOCK_EMAIL);
		expect(
			sent[0].status,
			`this app answered its own code request with ${sent[0].status}; a 400 here means its route refused the address before the mock saw it`
		).toBe(200);

		// Leg 2: what the mock was actually asked. `/auth/signin.email` exactly — the confirm path contains it.
		const asked = await mockWasAskedExactly('/auth/signin.email');
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
		const calls = watchAppApi(view);

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
			appAuthAsks(calls()),
			`a malformed address still reached this app's sign-in routes: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoAuthPath();
	});

	test('the code typed is the code the app asks the API to confirm, and the refusal is shown where the code was typed', async ({
		anon
	}) => {
		const view = await anon('/auth/passcode');
		const calls = watchAppApi(view);
		await askForCode(view, MOCK_EMAIL);

		await fillCodeSlots(view, SIGN_IN_CODE);
		await view.getByRole('button', { name: 'Sign in', exact: true }).click();

		// Leg 1: the typed code is what left the browser.
		const confirm = appCallsMatching(calls(), '/api/auth/signin-email-confirm');
		expect(
			confirm.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the app was never asked to confirm the code: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		const body = (confirm[0].body ?? {}) as { email?: string; code?: string; password?: string };
		expect(body.code, `the code the app was asked to confirm is not the one typed (${SIGN_IN_CODE})`).toBe(
			SIGN_IN_CODE
		);
		expect(body.email, `the code was confirmed for another address: ${JSON.stringify(body)}`).toBe(MOCK_EMAIL);
		expect(
			'password' in body,
			`the passwordless confirmation carried a password: ${JSON.stringify(Object.keys(body))}`
		).toBe(false);

		// Leg 2: what the mock was asked, in order. `…/signin-email-confirm` first tries an invite code, and the
		// app's second attempt (its invite-code route) asks the same invite check again.
		const confirmed = await mockWasAskedExactly('/auth/signin.email/confirm');
		expect(
			confirmed.map((request) => `${request.method} ${request.path} → ${request.status}`),
			'the mock was never asked to confirm the code'
		).toHaveLength(1);
		const inviteChecks = await mockCalls('/invite/validate-by-code');
		expect(
			inviteChecks.length,
			`the app checked the typed value against the invitation codes ${inviteChecks.length} times; both of its confirm routes do (app/api/auth/signin-email-confirm/route.ts and app/api/auth/login/route.ts)`
		).toBeGreaterThanOrEqual(1);

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
		const calls = watchAppApi(view);
		await askForCode(view, MOCK_EMAIL);

		// The field itself only takes 8 slots, so a short code is 5 slots filled and 3 left empty.
		const slots = codeSlots(view);
		for (let index = 0; index < 5; index += 1) await slots.nth(index).fill('A');
		await view.getByRole('button', { name: 'Sign in', exact: true }).click();
		await view.waitForTimeout(1_000);

		expect(
			appAuthAsks(calls()),
			`a ${5}-character code still reached this app's sign-in routes: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoAuthPath();

		// REAL DEFECT, asserted as it is: `handleCodeSubmit` (core/hooks/auth/use-authentication-passcode.ts) runs
		// `authFormValidate(['email','code'])`, stores its errors and returns — but it has already put the hook in
		// status 'loading', and `codeErrorOf` (code-step.tsx) only shows an error line while status is 'error'. So the
		// person who typed too little is told nothing at all: the slots stay as they are and the button is still
		// enabled. This assertion pins that silence; a fix that shows the reason fails it, on purpose.
		await expect(
			fieldError(view, 'passcode-code'),
			'a too-short code was refused without any message under the code field'
		).toHaveCount(0);
		await expect(
			codeSlotValues(view),
			'a too-short code was cleared or changed by the refusal; it should stay as the person typed it'
		).toBe('AAAAA');
	});

	test('the link in the e-mail (?email=&code=) fills the slots and asks for the confirmation by itself', async ({
		anon
	}) => {
		const view = await anon(`/auth/passcode?email=${MOCK_EMAIL}&code=${SIGN_IN_CODE}`);
		const calls = watchAppApi(view);

		// The hook reads the query on mount (`use-authentication-passcode.ts`) and confirms it; `code-step.tsx`
		// `codeFromAddressBar()` fills the slots from the same query and submits the form once they are full.
		await expect(
			view.locator('#passcode-code-label'),
			'a sign-in link with an address and a code did not open the code step'
		).toBeVisible({ timeout: 20_000 });

		const filled = await codeSlotValues(view);
		expect(filled, `the code from the link did not reach the slots (slots hold "${filled}")`).toBe(SIGN_IN_CODE);

		const confirms = appCallsMatching(calls(), '/api/auth/signin-email-confirm');
		expect(
			confirms.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the sign-in link never asked this app to confirm its code: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		expect(
			(confirms[0].body as { code?: string })?.code,
			`the confirmation carried ${JSON.stringify((confirms[0].body as { code?: string })?.code)}, not the code from the link`
		).toBe(SIGN_IN_CODE);

		const confirmations = await mockCallsExactly('/auth/signin.email/confirm');
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
		await askForCode(view, MOCK_EMAIL);

		const first = await mockCallsExactly('/auth/signin.email');
		expect(first.length, `asking for a code asked the mock ${first.length} times`).toBe(1);

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

		await resend.click();
		await view.waitForTimeout(1_000);

		const after = await mockCallsExactly('/auth/signin.email');
		expect(
			after.length,
			`clicking a locked resend asked the mock again (${after.length} asks: ${after
				.map((request) => `${request.method} ${request.path} → ${request.status}`)
				.join(', ')})`
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
