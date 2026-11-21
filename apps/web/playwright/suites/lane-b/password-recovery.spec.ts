import { expect, test } from '../../fixtures';
import { mockRequests } from '../../helpers';

import {
	appCallsMatching,
	describeAppCalls,
	describeCookies,
	describeMockLog,
	fieldError,
	MOCK_EMAIL,
	mockAuthAskCount,
	mockAskedNoNewAuthPath,
	mockWasAskedExactly,
	sessionCookies,
	UNDECODABLE_RESET_TOKEN,
	watchAppApi,
	expiredResetToken
} from './lane-auth-helpers';

/**
 * Password recovery: the two forms and what each of them proves.
 *
 * `/auth/forgot-password` (`core/components/pages/auth/forgot-password/forgot-password-form.tsx`) validates the
 * address with `emailErrorOf` (`core/components/auth/kit/auth-email.ts`) before it calls
 * `authService.requestPassword`, which in proxy mode posts this app's own `POST /api/auth/request-password`; that
 * route re-validates the address (`authFormValidate(['email'])` → **400** when it is bad), adds the reset link of
 * *this* deployment from its configured public origin, and asks the mock `POST /auth/request-password`.
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
		const calls = watchAppApi(view);
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
			appCallsMatching(calls(), '/api/auth/request-password'),
			`an empty forgot-password form still reached this app: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('an address that is not an address is refused with the auth forms’ own wording', async ({ anon }) => {
		const view = await anon('/auth/forgot-password');
		const calls = watchAppApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.locator('#forgot-email').fill('nope@nope');
		await view.getByRole('button', { name: 'Send the link' }).click();

		await expect(
			fieldError(view, 'forgot-email'),
			'a malformed address was not refused on the field'
		).toContainText('Enter a valid e-mail address');
		expect(
			appCallsMatching(calls(), '/api/auth/request-password'),
			`a malformed address still reached this app: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('asking for a reset link asks this app, which asks the mock, and leaves the browser with no session', async ({
		anon
	}) => {
		const view = await anon('/auth/forgot-password');
		const calls = watchAppApi(view);

		await view.locator('#forgot-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Send the link' }).click();

		// Leg 1: the browser asked this app's route, with the address and nothing else.
		const sent = appCallsMatching(calls(), '/api/auth/request-password');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the forgot-password form never reached this app: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		expect(
			Object.keys((sent[0].body ?? {}) as Record<string, unknown>).sort(),
			'the request-password body is not just the address'
		).toEqual(['email']);
		expect(
			(sent[0].body as { email?: string })?.email,
			'the reset link was asked for another address'
		).toBe(MOCK_EMAIL);

		// Leg 2: the mock was asked on Gauzy's own path.
		const asked = await mockWasAskedExactly('/auth/request-password');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the mock was never asked to send a reset link: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);

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

		// Scoped to the list `PasswordChecks` renders (the one whose last rule is the confirmation), so a list
		// elsewhere on the page cannot change the count.
		const rules = view
			.locator('ul')
			.filter({ hasText: 'Both passwords match' })
			.locator('li');
		expect(
			await rules.count(),
			`the reset form lists ${await rules.count()} rules: Gauzy's five plus "Both passwords match" make six`
		).toBe(6);
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
				`the reset form does not list the rule "${label}"`
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
		const calls = watchAppApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.locator('#reset-password').fill('Ab1!x');
		await view.locator('#reset-confirm').fill('Ab1!x');
		await view.getByRole('button', { name: 'Save the password' }).click();

		await expect(
			fieldError(view, 'reset-password'),
			'a 5-character password was not refused on the field'
		).toContainText('At least 8 characters');
		expect(
			appCallsMatching(calls(), '/api/auth/reset-password'),
			`a too-short password still reached this app: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('two different passwords are refused on the confirmation, not on the password', async ({ anon }) => {
		const view = await anon(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`);
		const calls = watchAppApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.locator('#reset-password').fill('Str0ng!Pass');
		await view.locator('#reset-confirm').fill('Str0ng!Pass2');
		await view.getByRole('button', { name: 'Save the password' }).click();

		await expect(
			fieldError(view, 'reset-confirm'),
			'a confirmation that does not match was not refused on its own field'
		).toContainText("Passwords don't match");
		await expect(
			fieldError(view, 'reset-password'),
			`the matching-enough password was refused too: ${await fieldError(view, 'reset-password').textContent()}`
		).toHaveCount(0);
		expect(
			appCallsMatching(calls(), '/api/auth/reset-password'),
			`a mismatched confirmation still reached this app: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('a valid reset is handed to this app, which asks the mock on Gauzy’s own reset path, and changes no session', async ({
		anon
	}) => {
		const view = await anon(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`);
		const calls = watchAppApi(view);

		await view.locator('#reset-password').fill('Str0ng!Pass');
		await view.locator('#reset-confirm').fill('Str0ng!Pass');
		await view.getByRole('button', { name: 'Save the password' }).click();

		// Leg 1: the browser asked this app, once, with the token and both copies of the password.
		const sent = appCallsMatching(calls(), '/api/auth/reset-password');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the reset form never reached this app: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		const body = (sent[0].body ?? {}) as Record<string, unknown>;
		expect(
			Object.keys(body).sort(),
			`the reset body is not {token, password, confirmPassword}: ${JSON.stringify(Object.keys(body).sort())}`
		).toEqual(['confirmPassword', 'password', 'token']);
		expect(body.token, 'the reset was asked with another token').toBe(UNDECODABLE_RESET_TOKEN);
		expect(body.password, 'the reset body does not carry the new password').toBe('Str0ng!Pass');
		expect(body.confirmPassword, 'the reset body does not carry the confirmation').toBe('Str0ng!Pass');

		// Leg 2: the mock was asked. It answers by echoing the body, so this proves the chain, not a change anywhere.
		const asked = await mockWasAskedExactly('/auth/reset-password');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the mock was never asked to reset the password: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);

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
