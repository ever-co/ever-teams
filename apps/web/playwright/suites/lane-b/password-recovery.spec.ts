import { expect, test } from '../../fixtures';
import { mockRequests } from '../../helpers';

import {
	appAuthAsks,
	describeAppCalls,
	describeCookies,
	describeMockLog,
	fieldError,
	MOCK_EMAIL,
	mockAuthAskCount,
	mockAskedNoNewAuthPath,
	mockWasAskedExactly,
	RESET_PASSWORD_OTHER,
	RESET_PASSWORD_VALUE,
	sessionCookies,
	UNDECODABLE_RESET_TOKEN,
	watchAppApi,
	watchedMockCall,
	watchMockApi,
	expiredResetToken
} from './lane-auth-helpers';

/**
 * Password recovery: the two forms and what each of them proves.
 *
 * `/auth/forgot-password` (`core/components/pages/auth/forgot-password/forgot-password-form.tsx`) validates the
 * address with `emailErrorOf` (`core/components/auth/kit/auth-email.ts`) before it calls `authService.requestPassword`.
 *
 * ⚠ Which leg that call takes, measured in this lane (`lane-b-password-recovery-1.log`): `requestPassword` branches on
 * `GAUZY_API_BASE_SERVER_URL.value` (`auth.service.ts:288-297`) and `playwright/test-servers.ts:109` sets it to this
 * lane's mock, so a mock run posts `POST <mock origin>/api/auth/request-password` **from the browser**, carrying the
 * reset link of the origin it is on (`appResetPasswordUrl = location.origin + RESET_PASSWORD_CALLBACK_PATH`,
 * `constants.tsx:290` = `/auth/reset-password`). Neither this app's `app/api/auth/request-password` handler nor its
 * body-keys-`['email']` shape belongs to this leg — those are a proxy deployment's, and `route-refusals.spec.ts`
 * reaches them by calling the handlers directly. `resetPassword` branches the same way (`auth.service.ts:303-310`).
 *
 * Which is also why every *refusal* witness in this file is a mock-leg one (`watchMockApi` plus the mock's ask count)
 * rather than an `app/api/auth/…` one: on this deployment a browser never asks those handlers, whatever a form does,
 * so "this app's handler was asked nothing" can only pass here. Those assertions were dropped rather than kept as
 * green lines; the surviving proof is the stronger one — the mock, which a submitted form *would* reach, was asked
 * nothing new. The two tests that submit do assert the empty handler list, and say there that it pins *which leg* was
 * taken, not that nothing was sent.
 *
 * `/auth/reset-password` is read on the server first: `app/[locale]/auth/reset-password/page.tsx` decodes the
 * `?token=` and refuses it only when it decodes to a payload whose `exp` has passed — so an undecodable token still
 * gets the form ("Gauzy remains the authority on submit"), and an expired one gets the warning without the form
 * ever reaching the browser. The form then validates against Gauzy's reset rules
 * (`core/lib/utils/password-strength.ts`, `PASSWORD_MIN_LENGTH` 8 plus upper/lower/digit/symbol) before it posts
 * `…/api/auth/reset-password`.
 *
 * What the mock cannot answer: whether the reset link was real. It answers `POST /auth/reset-password` by echoing
 * the body (`cypress/support/mock-gauzy-server.mjs`), so the "Password changed" state below proves only that the
 * browser → this app → mock chain completed; it is never proof that a password was changed anywhere.
 */
test.describe('lane-b · password recovery', () => {
	test('a forgot-password form with nothing typed is refused on the field and asks nothing', async ({ anon }) => {
		const view = await anon('/auth/forgot-password');
		const calls = watchMockApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.getByRole('button', { name: 'Send the link' }).click();

		await expect(
			fieldError(view, 'forgot-email'),
			'an empty address was not refused on the field'
		).toContainText('Email address is required');
		await expect(
			view.locator('#forgot-email'),
			'a refused address was given aria-invalid'
		).toHaveAttribute('aria-invalid', 'true');
		expect(
			calls().filter((call) => call.path === '/api/auth/request-password'),
			`an empty forgot-password form still sent its request to the API: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('an address that is not an address is refused with the auth forms’ own wording', async ({ anon }) => {
		const view = await anon('/auth/forgot-password');
		const calls = watchMockApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.locator('#forgot-email').fill('nope@nope');
		await view.getByRole('button', { name: 'Send the link' }).click();

		await expect(
			fieldError(view, 'forgot-email'),
			'a malformed address was not refused on the field'
		).toContainText('Enter a valid e-mail address');
		expect(
			calls().filter((call) => call.path === '/api/auth/request-password'),
			`a malformed address still sent its request to the API: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('asking for a reset link sends it straight to the API with this app\'s reset-link address, and leaves the browser with no session', async ({
		anon
	}) => {
		const view = await anon('/auth/forgot-password');
		const calls = watchMockApi(view);
		const appCalls = watchAppApi(view);

		await view.locator('#forgot-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Send the link' }).click();

		// Leg 1: what left the browser, on the leg a mock run really takes (file header). The body names the address
		// and the page the e-mail link will open — that pair is the whole request, and it is what a real reset link
		// would be built from.
		const sent = await watchedMockCall(calls, '/api/auth/request-password');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the forgot-password form never sent its request to the API: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		expect(
			Object.keys((sent[0].body ?? {}) as Record<string, unknown>).sort(),
			`the request-password body is not {email, appResetPasswordUrl}: ${JSON.stringify(
				Object.keys((sent[0].body ?? {}) as Record<string, unknown>).sort()
			)}`
		).toEqual(['appResetPasswordUrl', 'email']);
		expect(
			(sent[0].body as { email?: string })?.email,
			'the reset link was asked for another address'
		).toBe(MOCK_EMAIL);
		expect(
			(sent[0].body as { appResetPasswordUrl?: string })?.appResetPasswordUrl,
			`the request no longer names the page the reset link opens: ${JSON.stringify(
				(sent[0].body as { appResetPasswordUrl?: string })?.appResetPasswordUrl
			)}`
		).toContain('/auth/reset-password');

		expect(
			sent[0].status,
			`the API answered the reset-link request with ${sent[0].status}; the "sent" state below is only honest if the request went`
		).toBe(200);

		// Leg 2: the mock recorded the same call, in the spelling its log holds.
		const asked = await mockWasAskedExactly('/api/auth/request-password');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the mock was never asked to send a reset link: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
		// Which leg that was: this app's own `app/api/auth/request-password` handler was asked nothing. This asserts
		// *which door the browser went through*, not that nothing was sent — leg 1 and 2 already proved the send.
		expect(
			appAuthAsks(appCalls()),
			`this app's own sign-in route was asked, although the mock leg is the one the client takes here: ${describeAppCalls(
				appCalls()
			)}`
		).toEqual([]);

		// What the person is told, and that a link request is not a session.
		await expect(
			view.getByText('Check your inbox', { exact: true }),
			'the form did not move to its "sent" state'
		).toBeVisible();
		await expect(
			view.getByText(MOCK_EMAIL, { exact: true }).first(),
			`the sent state does not name the address the link was sent to (${MOCK_EMAIL})`
		).toBeVisible();
		await expect(
			view.locator('#forgot-email'),
			'the address field is still on the page after the link was sent'
		).toHaveCount(0);
		expect(
			await sessionCookies(view.context()),
			`asking for a reset link wrote session cookies: ${await describeCookies(view.context())}`
		).toEqual([]);
	});

	test('the sent state can be left with "Use another e-mail", back to the same form', async ({ anon }) => {
		const view = await anon('/auth/forgot-password');

		await view.locator('#forgot-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Send the link' }).click();
		await expect(view.getByText('Check your inbox', { exact: true })).toBeVisible();

		await view.getByRole('button', { name: 'Use another e-mail' }).click();

		await expect(
			view.locator('#forgot-email'),
			'"Use another e-mail" did not bring the form back'
		).toBeVisible();
	});

	test('a reset link with no token at all offers no form and points to asking for a new link', async ({ anon }) => {
		const view = await anon('/auth/reset-password');

		await expect(
			view.getByText('This link no longer works', { exact: true }),
			'a reset page without a token did not say the link is dead'
		).toBeVisible();
		await expect(
			view.locator('#reset-password'),
			'a reset page without a token still offers a password field'
		).toHaveCount(0);
		await expect(
			view.getByRole('link', { name: 'Request a new reset link' }),
			'the dead-link page does not offer a way to ask for a new link'
		).toHaveAttribute('href', /\/auth\/forgot-password/);
	});

	test('a token the server can read and whose expiry has passed is refused before the form is offered', async ({
		anon
	}) => {
		// `app/[locale]/auth/reset-password/page.tsx` decodes the token on the server and passes
		// `isTokenExpired` down; the token below is an unsigned JWT with `iat` two hours ago and `exp` one hour ago,
		// the shape `decodeJWT` accepts.
		const view = await anon(`/auth/reset-password?token=${expiredResetToken()}`);

		await expect(
			view.getByText('This link no longer works', { exact: true }),
			'an expired reset token was not refused on the server'
		).toBeVisible();
		await expect(
			view.getByText('This reset link is invalid or has expired'),
			'the expired link does not say it expired'
		).toBeVisible();
		await expect(
			view.locator('#reset-password'),
			'an expired reset token still offered a password field'
		).toHaveCount(0);
	});

	test('a token the server cannot decode is not called dead: the form is offered, and Gauzy stays the authority', async ({
		anon
	}) => {
		const view = await anon(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`);

		await expect(
			view.locator('#reset-password'),
			'a token this app cannot decode was treated as an expired one instead of being sent on'
		).toBeVisible();
		await expect(
			view.getByText('This link no longer works', { exact: true }),
			'a token this app cannot decode was called dead'
		).toHaveCount(0);
	});

	test('the reset form lists the five rules Gauzy enforces, plus the confirmation', async ({ anon }) => {
		const view = await anon(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`);

		// The form first, then the list. `locator.count()` does **not** wait, and the 2026-11-21 reading of 0 here was
		// taken against a page that had not rendered the list yet (`lane-b-password-recovery-1.log`: `Expected: 6 /
		// Received: 0`, then the case sat until the 180 s test timeout on the six label assertions that follow).
		// `toHaveCount` polls, so the number is measured against a rendered page, and the message prints every `ul`
		// and `li` text the page really holds — the markup dump PLAN.md §9 asked for, so a red here says what the form
		// listed rather than only that it did not list six.
		await expect(
			view.locator('#reset-password'),
			'the reset form is not on the page, so counting its rules proves nothing'
		).toBeVisible();

		const ulTexts = () =>
			view.locator('ul').evaluateAll((nodes) =>
				nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200))
			);
		const rules = view
			.locator('ul')
			.filter({ hasText: 'Both passwords match' })
			.locator('li');

		await expect(
			rules,
			`the reset form listed ${await rules.count()} rules where Gauzy's five plus "Both passwords match" make six. ` +
				`uls on the page: ${JSON.stringify(await ulTexts())}. ` +
				`Renderer: core/components/auth/kit/password-checks.tsx (RESET_PASSWORD_RULES.map + the confirmation row), ` +
				`labels from locales/en.json auth.password.RULE_*`
		).toHaveCount(6);
		for (const label of [
			'At least 8 characters',
			'An uppercase letter (A-Z)',
			'A lowercase letter (a-z)',
			'A digit (0-9)',
			'A symbol, like ! @ # or -',
			'Both passwords match'
		]) {
			await expect(
				rules.filter({ hasText: label }),
				`the reset form does not list the rule "${label}" (its uls: ${JSON.stringify(await ulTexts())})`
			).toHaveCount(1);
		}

		await view.locator('#reset-password').fill('Ab1!x');
		await expect(
			rules.filter({ hasText: 'At least 8 characters' }),
			'a 5-character password is not marked as missing the length rule'
		).toContainText('Requirement not met');
	});

	test('a password shorter than the 8 Gauzy asks for is refused on the field and never sent', async ({ anon }) => {
		const view = await anon(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`);
		const calls = watchMockApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.locator('#reset-password').fill('Ab1!x');
		await view.locator('#reset-confirm').fill('Ab1!x');
		await view.getByRole('button', { name: 'Save the password' }).click();

		await expect(
			fieldError(view, 'reset-password'),
			'a 5-character password was not refused on the field'
		).toContainText('At least 8 characters');
		expect(
			calls().filter((call) => call.path === '/api/auth/reset-password'),
			`a too-short password still sent its new password to the API: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('two different passwords are refused on the confirmation, not on the password', async ({ anon }) => {
		const view = await anon(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`);
		const calls = watchMockApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.locator('#reset-password').fill(RESET_PASSWORD_VALUE);
		await view.locator('#reset-confirm').fill(RESET_PASSWORD_OTHER);
		await view.getByRole('button', { name: 'Save the password' }).click();

		await expect(
			fieldError(view, 'reset-confirm'),
			'a confirmation that does not match was not refused on its own field'
		).toContainText("Passwords don't match");
		// The count is read before any text, because `expect(value, message)` builds its message *eagerly*: the
		// 2026-11-21 run hung here for 180 000 ms on `locator.textContent: … waiting for locator('#reset-password-error')`
		// — the assertion was that this element is absent, and the message tried to read its text.
		const passwordError = fieldError(view, 'reset-password');
		const passwordErrorCount = await passwordError.count();
		const passwordErrorText =
			passwordErrorCount > 0 ? await passwordError.textContent() : '(no error line, which is what this asserts)';
		expect(passwordErrorCount, `the matching-enough password was refused too: ${passwordErrorText}`).toBe(0);
		expect(
			calls().filter((call) => call.path === '/api/auth/reset-password'),
			`a mismatched confirmation still sent its new password to the API: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('a valid reset is sent straight to the API with the token and both passwords, and changes no session', async ({
		anon
	}) => {
		const view = await anon(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`);
		const calls = watchMockApi(view);
		const appCalls = watchAppApi(view);

		await view.locator('#reset-password').fill(RESET_PASSWORD_VALUE);
		await view.locator('#reset-confirm').fill(RESET_PASSWORD_VALUE);
		await view.getByRole('button', { name: 'Save the password' }).click();

		// Leg 1: what left the browser, on the leg a mock run really takes (file header): once, with the token and
		// both copies of the password.
		const sent = calls().filter((call) => call.path === '/api/auth/reset-password');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the reset form never sent its new password to the API: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		const body = (sent[0].body ?? {}) as Record<string, unknown>;
		expect(
			Object.keys(body).sort(),
			`the reset body is not {token, password, confirmPassword}: ${JSON.stringify(Object.keys(body).sort())}`
		).toEqual(['confirmPassword', 'password', 'token']);
		expect(body.token, 'the reset was asked with another token').toBe(UNDECODABLE_RESET_TOKEN);
		expect(body.password, `the reset body does not carry the new password (${JSON.stringify(body.password)})`).toBe(
			RESET_PASSWORD_VALUE
		);
		expect(
			body.confirmPassword,
			`the reset body does not carry the confirmation (${JSON.stringify(body.confirmPassword)})`
		).toBe(RESET_PASSWORD_VALUE);

		// Leg 2: the mock recorded the same call, in the spelling its log holds. It answers by echoing the body, so
		// this proves the chain, not a change anywhere.
		const asked = await mockWasAskedExactly('/api/auth/reset-password');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the mock was never asked to reset the password: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
		// And this app's own `app/api/auth/reset-password` handler was asked nothing — the route `route-refusals.spec.ts`
		// pins by calling it directly is not on the leg a browser on this deployment takes.
		expect(
			appAuthAsks(appCalls()),
			`this app's own sign-in route was asked, although the mock leg is the one the client takes here: ${describeAppCalls(
				appCalls()
			)}`
		).toEqual([]);

		await expect(
			view.getByText('Password changed', { exact: true }),
			'the reset did not report itself finished after the mock answered'
		).toBeVisible();
		expect(
			await sessionCookies(view.context()),
			`resetting a password wrote session cookies: ${await describeCookies(view.context())}`
		).toEqual([]);
	});
});
