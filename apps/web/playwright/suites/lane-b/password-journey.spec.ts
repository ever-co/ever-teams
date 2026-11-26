import { expect, test } from '../../fixtures';
import { mockRequests } from '../../helpers';

import {
	appAuthAsks,
	describeAppCalls,
	describeCookies,
	describeMockLog,
	fieldError,
	MOCK_EMAIL,
	mockAskedNoAuthPath,
	mockWasAskedExactly,
	sessionCookies,
	watchAppApi,
	watchMockApi
} from './lane-auth-helpers';

/** The mock-leg calls whose path is exactly `path`. */
const mockLegCalls = (calls: ReturnType<typeof watchMockApi>, path: string) =>
	calls().filter((call) => call.path === path);

/**
 * The password sign-in and what it refuses.
 *
 * `/auth/password` renders the same page as `/auth/passcode` and only opens it on the other method
 * (`core/components/pages/auth/sign-in/sign-in-page.tsx`), so the interesting part is which request each button makes
 * and which refusal stops it. `use-authentication-password.ts` validates with `validateForm(['email','password'])`
 * (`core/lib/helpers/validations.ts`) before it calls `authService.signInEmailPassword`.
 *
 * ⚠ Which leg that call takes, measured 2026-11-21 in this lane (`lane-b-password-journey-1.log`): the branch is on
 * `GAUZY_API_BASE_SERVER_URL.value` (`auth.service.ts:188-193`), and `playwright/test-servers.ts:109` sets
 * `NEXT_PUBLIC_GAUZY_API_SERVER_URL` to this lane's mock, so a mock run takes the **direct** branch — the browser
 * posts `POST <mock origin>/api/auth/signin.email.password` with `{ email, password, includeTeams: true }` (axios adds
 * the `/api` segment, `core/services/client/axios.ts:110`) and this app's own `app/api/auth/signin-email-password`
 * handler is never asked. That handler belongs to a proxy deployment; `route-refusals.spec.ts` reaches it directly.
 * The refusals below are therefore witnessed two ways: `appAuthAsks` (no handler of this app's sign-in family was
 * asked — NextAuth's own `/api/auth/session` chatter is deliberately outside that list, `lane-auth-helpers.ts`) and
 * the mock's own log. The 2026-11-21 reds here were a filter written as `'/api/auth/'`, which matches NextAuth's
 * chatter on any page mount and so red-flagged a page, not a submit.
 *
 * What the mock cannot answer here, and therefore what this lane cannot prove: a *refusal by the API*. The mock
 * answers every POST it does not know with 200 and the request body echoed
 * (`cypress/support/mock-gauzy-server.mjs`, `routeResponse`'s last lines), and no scenario switch makes it refuse a
 * credential. So the app's 4xx branches — `errors.loginFailed = 'Incorrect email address or password'` and the
 * `data.status` starting with '4' — are unreachable through this mock, and the tests below pin the refusals that
 * *are* reachable: the form's own, and the shape of the request that a real refusal would follow.
 */
test.describe('lane-b · the password sign-in journey', () => {
	test('an empty password form is refused on both fields and never asks anything', async ({ anon }) => {
		const view = await anon('/auth/password');
		const calls = watchAppApi(view);

		await view.getByRole('button', { name: 'Sign in', exact: true }).click();

		await expect(
			fieldError(view, 'passcode-email'),
			'an empty address produced no error line under the address field'
		).toContainText('fill out this field');
		await expect(
			fieldError(view, 'pw-password'),
			'an empty password produced no error line under the password field'
		).toContainText('fill out this field');
		await expect(
			view.locator('#pw-password'),
			'a refused password was given aria-invalid'
		).toHaveAttribute('aria-invalid', 'true');

		expect(
			appAuthAsks(calls()),
			`an empty form still reached this app's sign-in routes: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoAuthPath();
	});

	test('a malformed address is refused with the password form’s own wording', async ({ anon }) => {
		const view = await anon('/auth/password');
		const calls = watchAppApi(view);

		await view.locator('#passcode-email').fill('nope@nope');
		await view.locator('#pw-password').fill('secret123');
		await view.getByRole('button', { name: 'Sign in', exact: true }).click();

		await expect(
			fieldError(view, 'passcode-email'),
			'a malformed address was not refused on the field'
		).toContainText('valid email address');
		expect(
			appAuthAsks(calls()),
			`a malformed address still reached this app's sign-in routes: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoAuthPath();
	});

	test('a one-character password is refused as an empty field, not as a weak one', async ({ anon }) => {
		const view = await anon('/auth/password');
		const calls = watchAppApi(view);

		await view.locator('#passcode-email').fill(MOCK_EMAIL);
		await view.locator('#pw-password').fill('x');
		await view.getByRole('button', { name: 'Sign in', exact: true }).click();

		// `validateForm` refuses anything shorter than two characters with its one general message; the sign-in form
		// has no length rule of its own (only the reset and signup forms carry Gauzy's 8).
		await expect(
			fieldError(view, 'pw-password'),
			'a one-character password was not refused on the field'
		).toContainText('fill out this field');
		expect(
			appAuthAsks(calls()),
			`a one-character password still reached this app's sign-in routes: ${describeAppCalls(calls())}`
		).toEqual([]);
		await mockAskedNoAuthPath();
	});

	test('a well-formed attempt reaches the mock as a password sign-in, and a session-less answer leaves no cookies and no message', async ({
		anon
	}) => {
		const view = await anon('/auth/password');
		const calls = watchMockApi(view);
		const appCalls = watchAppApi(view);

		await view.locator('#passcode-email').fill(MOCK_EMAIL);
		await view.locator('#pw-password').fill('secret123');
		await view.getByRole('button', { name: 'Sign in', exact: true }).click();

		// Leg 1: what left the browser, on the leg a mock run really takes (see the file header). The body is
		// asserted by shape and length only, never printed: it carries the credential.
		const attempt = mockLegCalls(calls, '/api/auth/signin.email.password');
		expect(
			attempt.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the password form never sent its attempt to the API: ${describeAppCalls(calls())}`
		).toHaveLength(1);
		const body = (attempt[0].body ?? {}) as Record<string, unknown>;
		expect(
			Object.keys(body).sort(),
			`the password sign-in body is not the shape the hook sends ({email, password, includeTeams}): ${Object.keys(body).sort().join(', ')}`
		).toEqual(['email', 'includeTeams', 'password']);
		expect(body.email, 'the password sign-in was asked for another address').toBe(MOCK_EMAIL);
		expect(
			typeof body.password === 'string' && (body.password as string).length > 0,
			'the password sign-in carried no password at all'
		).toBe(true);
		expect(body.includeTeams, 'the password sign-in did not ask for the workspaces with the session').toBe(true);

		// Leg 2: the mock recorded the same call, with this app's `/api` prefix — the spelling its log holds.
		const asked = await mockWasAskedExactly('/api/auth/signin.email.password');
		expect(
			asked.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the mock was never asked to sign in with a password: ${describeMockLog(await mockRequests())}`
		).toHaveLength(1);
		// …and this app's own handler was not asked at all, which is what says the attempt went on the direct leg
		// rather than through `app/api/auth/signin-email-password` (that route is a proxy-deployment leg).
		expect(
			appAuthAsks(appCalls()),
			`this app's own sign-in route was asked, although the mock leg is the one the client takes here: ${describeAppCalls(
				appCalls()
			)}`
		).toEqual([]);

		// Leg 3: the answer carried no session, so none was written. The mock echoes the body it was given, so what
		// the app got back has no `workspaces` and no token; `use-authentication-password.ts` then does nothing at
		// all — no workspace step, no message, no cookies. That silence is the app's real behaviour on an answer it
		// cannot read as either a success or a refusal, and it is asserted as it is.
		await expect(
			view.locator('#pw-password'),
			'the form left the credentials step although nothing signed in'
		).toBeVisible();
		await expect(
			view.getByText('Incorrect email address or password'),
			'the page reported a login failure this API never reported (the mock answers 200 by echoing the body)'
		).toHaveCount(0);
		expect(
			await sessionCookies(view.context()),
			`a sign-in that never happened wrote session cookies: ${await describeCookies(view.context())}`
		).toEqual([]);
	});

	test('the address typed stays typed when the person switches to the password method', async ({ anon }) => {
		const view = await anon('/auth/passcode');

		await view.locator('#passcode-email').fill(MOCK_EMAIL);
		await view.getByRole('tab', { name: 'Password' }).click();

		await expect(
			view.locator('#passcode-email'),
			'switching method lost the address that was typed'
		).toHaveValue(MOCK_EMAIL);
		// credentials-step.tsx focuses the password input when the switch happens with an address already typed.
		await expect(
			view.locator('#pw-password'),
			'switching to the password method with an address typed did not put the cursor on the password field'
		).toBeFocused();
	});

	test('the link under the password field opens the password-recovery page', async ({ anon }) => {
		const view = await anon('/auth/password');

		await view.getByRole('link', { name: 'Forgot password?' }).click();

		await expect(
			view,
			'"Forgot password?" did not lead to the recovery page'
		).toHaveURL(/\/auth\/forgot-password/);
		await expect(
			view.locator('#forgot-email'),
			'the recovery page does not ask for the address'
		).toBeVisible();
	});
});
