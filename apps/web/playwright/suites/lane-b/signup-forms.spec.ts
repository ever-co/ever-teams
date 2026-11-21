import { expect, test } from '../../fixtures';
import { mockRequests } from '../../helpers';

import {
	appAuthAsks,
	appCallsMatching,
	describeAppCalls,
	describeCookies,
	describeMockLog,
	fieldError,
	MOCK_EMAIL,
	mockAuthAskCount,
	mockCallsExactly,
	mockAskedNoNewAuthPath,
	revealBoxOf,
	sessionCookies,
	watchAppApi
} from './lane-auth-helpers';

/**
 * The sign-up form's own refusals, and the one submission the mock lets through.
 *
 * `/auth/signup` is a two-step form (`core/components/pages/auth/signup/page-component.tsx`, driven by
 * `core/hooks/auth/use-authentication-team.ts`): step 1 is the name and the address, validated by
 * `authFormValidate(['email','name'])` (`core/lib/helpers/validations.ts`) before anything is sent; step 2 chooses
 * how the person starts — solo (a team named after them) or with a team named now — and validates the team name the
 * same way. Only the finished step 2 posts, to this app's own `POST /api/auth/register`
 * (`app/api/auth/register/route.ts`), which re-validates `email`, `name` and `team` and answers **400** on a bad
 * body — deliberately, because `useAuthenticationTeam` reads `errors` only on 400.
 *
 * Captcha: this run sets `NEXT_PUBLIC_CAPTCHA_SITE_KEY` blank and `apps/web/.env` keeps `CAPTCHA_SECRET_KEY` and
 * `NEXT_PUBLIC_CAPTCHA_TYPE` blank, so no widget is rendered (`ReCAPTCHA` returns null without a site key),
 * `recaptcha` is not in the client's validation fields, and the route skips `recaptchaVerification` — which is also
 * why no signup test here reaches a captcha provider over the network.
 *
 * What the mock cannot answer: Gauzy's answer to `POST /auth/register` (a created user, then a login token). It
 * echoes the body it was given (`cypress/support/mock-gauzy-server.mjs`), so the route's own follow-up chain —
 * login, tenant, organization, employee, team, refresh, `setAuthCookies` — runs on an answer that carries none of
 * the fields it reads. The last test states what that leaves the browser with, measured, not as an app bug.
 */
test.describe('lane-b · the sign-up form', () => {
	test('an empty sign-up is refused on the name and on the address, and nothing is sent', async ({ anon }) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.getByRole('button', { name: 'Continue', exact: true }).click();

		await expect(
			fieldError(view, 'signup-name'),
			'an empty name produced no error line under the name field'
		).toContainText('You must provide a valid Name');
		await expect(
			fieldError(view, 'signup-email'),
			'an empty address produced no error line under the address field'
		).toContainText('properly formatted email address');
		await expect(
			view.locator('#signup-email'),
			'a refused address was given aria-invalid'
		).toHaveAttribute('aria-invalid', 'true');

		// Still step 1: the mode choice never opened.
		await expect(
			view.getByRole('button', { name: 'Continue', exact: true }),
			'the form moved to step 2 although both fields were empty'
		).toBeVisible();

		expect(
			appAuthAsks(calls()),
			`an empty sign-up still reached this app's sign-in routes: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('a real name with an address that is not an address is refused on the address only', async ({ anon }) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);
		const asksBefore = await mockAuthAskCount();

		await view.locator('#signup-name').fill('Jane Cooper');
		await view.locator('#signup-email').fill('nope@nope');
		await view.getByRole('button', { name: 'Continue', exact: true }).click();

		await expect(
			fieldError(view, 'signup-email'),
			'a malformed address was not refused on the field'
		).toContainText('properly formatted email address');
		// Same shape as the confirmation case above: read the count first. `expect(value, message)` evaluates its
		// message eagerly, and the 2026-11-21 run spent 180 000 ms here on `locator.textContent: … waiting for
		// locator('#signup-name-error')` while asserting that very element is absent.
		const nameError = fieldError(view, 'signup-name');
		const nameErrorCount = await nameError.count();
		const nameErrorText = nameErrorCount > 0 ? await nameError.textContent() : '(no error line, which is what this asserts)';
		expect(nameErrorCount, `the name "Jane Cooper" was refused too: ${nameErrorText}`).toBe(0);

		expect(
			appAuthAsks(calls()),
			`a malformed address still reached this app's sign-in routes: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('the form never claims an address already has an account; it points to signing in instead', async ({ anon }) => {
		const view = await anon('/auth/signup');

		// Gauzy answers a sign-up the same way whether the address is known or not, so the form cannot refuse a
		// taken address — it says so under the field instead (the component's own comment on ExistingAccountHint).
		await expect(
			view.getByText('Already have an account with this e-mail?'),
			'the sign-up form does not warn that an address may already have an account'
		).toBeVisible();
		await expect(
			view.getByRole('link', { name: 'Sign in instead' }),
			'that warning does not lead to the sign-in page'
		).toHaveAttribute('href', /\/auth\/passcode/);
	});

	test('an address carried in the link is already typed in the form', async ({ anon }) => {
		// `useAuthenticationTeam` seeds the form from `?email=` (or from `ever-teams-start-email`), which is how a
		// person who was refused at sign-in arrives here without retyping.
		const view = await anon(`/auth/signup?email=${MOCK_EMAIL}`);

		await expect(
			view.locator('#signup-email'),
			`the address from the link did not reach the form (it holds "${await view.locator('#signup-email').inputValue()}")`
		).toHaveValue(MOCK_EMAIL);
	});

	test('step 1 accepted opens the mode choice with the team field closed', async ({ anon }) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);

		await view.locator('#signup-name').fill('Jane Cooper');
		await view.locator('#signup-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Continue', exact: true }).click();

		// The copy is on the page **twice** and the 2026-11-21 run said so exactly: `strict mode violation:
		// getByText('How do you want to start?') resolved to 2 elements: 1) <h1 class="text-xl font-semibold …">
		// 2) <legend class="sr-only">`. So the case names the heading and pins the screen-reader legend beside it —
		// the duplicate is the form's own accessible name for the radiogroup, not a bug to hide.
		await expect(
			view.getByRole('heading', { name: 'How do you want to start?' }),
			'step 1 did not open the mode choice (its heading is not on the page)'
		).toBeVisible();
		await expect(
			view.locator('legend.sr-only', { hasText: 'How do you want to start?' }),
			'the mode choice has no screen-reader legend naming the choice'
		).toHaveCount(1);
		const modes = view.getByRole('radio', { name: /On my own|With my team/ });
		expect(await modes.count(), `the mode choice offers ${await modes.count()} ways to start, not two`).toBe(2);
		await expect(
			view.getByRole('radio', { name: /On my own/ }),
			'starting solo is not the choice the form opens with'
		).toBeChecked();
		await expect(
			view.getByRole('radio', { name: /With my team/ }),
			'the team choice is checked although the form starts solo'
		).not.toBeChecked();

		// The team field is mounted but closed: `AuthReveal` collapses its grid row and marks it inert, so the
		// field's own box says nothing about whether the person can use it (see `revealBoxOf`).
		const closed = await revealBoxOf(view, 'signup-team');
		expect(closed, 'the closed team field is not inside a reveal row at all').not.toBeNull();
		expect(
			(closed as { revealHeight: number; inert: boolean }).inert,
			'the closed team field is not inert, so it could still be typed into'
		).toBe(true);
		expect(
			(closed as { revealHeight: number }).revealHeight,
			`the closed team field's row is ${closed?.revealHeight}px tall, not 0`
		).toBe(0);

		// Choosing a method is not submitting: nothing was asked yet.
		expect(
			appAuthAsks(calls()),
			`moving to step 2 already asked this app: ${describeAppCalls(calls())}`
		).toEqual([]);
	});

	test('choosing "With my team" opens its field, and a one-character team name is refused there', async ({ anon }) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);

		await view.locator('#signup-name').fill('Jane Cooper');
		await view.locator('#signup-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Continue', exact: true }).click();
		await view.getByText('With my team', { exact: true }).click();

		await expect(
			view.getByRole('radio', { name: /With my team/ }),
			'clicking the team choice did not check its radio'
		).toBeChecked();
		// The row grows over 250ms; poll it rather than guess a wait.
		await expect
			.poll(async () => (await revealBoxOf(view, 'signup-team'))?.revealHeight, { timeout: 10_000 })
			.toBeGreaterThan(0);
		expect(
			(await revealBoxOf(view, 'signup-team'))?.inert,
			'the opened team field is still inert, so it cannot be typed into'
		).toBe(false);

		const asksBefore = await mockAuthAskCount();
		await view.locator('#signup-team').fill('X');
		await view.getByRole('button', { name: 'Create my workspace' }).click();

		await expect(
			fieldError(view, 'signup-team'),
			'a one-character team name was not refused on the field'
		).toContainText('You must provide a valid Team Name');
		await expect(
			view.getByRole('button', { name: 'Create my workspace' }),
			'the form submitted although the team name was refused'
		).toBeVisible();

		expect(
			appAuthAsks(calls()),
			`a refused team name still reached this app's sign-in routes: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoNewAuthPath(asksBefore);
	});

	test('a finished sign-up form is handed to this app, which asks the mock on Gauzy’s own register path', async ({
		anon
	}) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);

		await view.locator('#signup-name').fill('Jane Cooper');
		await view.locator('#signup-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Continue', exact: true }).click();
		await view.getByText('With my team', { exact: true }).click();
		await view.locator('#signup-team').fill('Lane B Team');

		await view.getByRole('button', { name: 'Create my workspace' }).click();

		// Leg 1: the browser asked this app, once, and the body is the form.
		const sent = appCallsMatching(calls(), '/api/auth/register');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the finished sign-up never reached this app's register route: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		const body = (sent[0].body ?? {}) as Record<string, unknown>;
		expect(body.name, `the register body carries name ${JSON.stringify(body.name)}`).toBe('Jane Cooper');
		expect(body.email, `the register body carries email ${JSON.stringify(body.email)}`).toBe(MOCK_EMAIL);
		expect(body.team, `the register body carries team ${JSON.stringify(body.team)}`).toBe('Lane B Team');
		expect(
			typeof body.timezone === 'string' && (body.timezone as string).length > 0,
			`the register body carries no timezone: ${JSON.stringify(Object.keys(body).sort())}`
		).toBe(true);
		expect(
			'password' in body,
			`the browser sent a password in the sign-up body: ${JSON.stringify(Object.keys(body).sort())}`
		).toBe(false);

		// Leg 2: the route accepted the body (its own `authFormValidate(['email','name','team'])` passed) and asked
		// Gauzy's path. The mock answers it by echoing the body.
		const asked = await mockCallsExactly('/auth/register');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the mock was never asked to register the user: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
	});

	test('a sign-up the mock cannot finish leaves the browser with no session at all', async ({ anon }) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);

		await view.locator('#signup-name').fill('Jane Cooper');
		await view.locator('#signup-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Continue', exact: true }).click();
		await view.getByText('With my team', { exact: true }).click();
		await view.locator('#signup-team').fill('Lane B Team');
		await view.getByRole('button', { name: 'Create my workspace' }).click();

		// Read the app's own answer to its register route. `app/api/auth/register/route.ts` registers the user, then
		// logs in to get a token, creates tenant/organization/employee/team, refreshes, and calls `setAuthCookies`,
		// which reads `access_token.length` (`core/lib/helpers/cookies/index.ts`). The mock answers every one of those
		// POSTs by echoing the request body, so the login answer carries no `token`, and this route dies on the
		// undefined token instead of writing cookies. A 500 here is the mock's limit, not a session the app granted;
		// the point this test pins is that no cookie of a session was written on the way.
		const sent = appCallsMatching(calls(), '/api/auth/register');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the register route was never asked: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		expect(
			sent[0].status,
			`this app answered its own register route with ${sent[0].status}; the chain was expected to die on the mock's token-less login answer (see PLAN.md)`
		).toBe(500);

		expect(
			await sessionCookies(view.context()),
			`a sign-up that never produced a token still left session cookies in the jar: ${await describeCookies(
				view.context()
			)}`
		).toEqual([]);
	});
});
