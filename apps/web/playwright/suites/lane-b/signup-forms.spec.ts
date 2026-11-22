import { expect, test } from '../../fixtures';
import { mockRequests } from '../../helpers';
import type { Page } from '@playwright/test';

import {
	appAuthAsks,
	appCallsMatching,
	type AppApiCall,
	describeAppCalls,
	describeMockLog,
	fieldError,
	MOCK_EMAIL,
	mockAuthAskCount,
	mockAskedNoNewAuthPath,
	mockWasAsked,
	revealBoxOf,
	watchAppApi
} from './lane-auth-helpers';

/**
 * What the sign-up page holds, as one readable object, for the two failure messages that have to say *which step* the
 * form was on. Written because the 2026-11-21 run and `lane-b-signup-forms-1.log` both recorded `Received length: 0`
 * for `/api/auth/register` with no hint of where the form stopped: the mode radios, the reveal and the team-name
 * refusal all pass, so the step that does not submit has to be named by its own state, not guessed.
 */
const signupState = (view: { evaluate: <T>(fn: () => T) => Promise<T> }) =>
	view.evaluate(() => {
		const inputOf = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? null;
		const field = document.getElementById('signup-team');
		const reveal = field?.closest('[class*="grid-rows-"]') as HTMLElement | null;
		const errorOf = (id: string) => document.getElementById(`${id}-error`)?.textContent?.trim() ?? null;
		return {
			url: window.location.href,
			name: inputOf('signup-name'),
			email: inputOf('signup-email'),
			team: inputOf('signup-team'),
			revealHeight: reveal ? Math.round(reveal.getBoundingClientRect().height) : null,
			inert: reveal ? reveal.hasAttribute('inert') : null,
			errors: ['signup-name', 'signup-email', 'signup-team'].map((id) => `${id}=${errorOf(id)}`).join(', '),
			buttons: Array.from(document.querySelectorAll('button'))
				.map((button) => `${button.textContent?.trim() ?? ''}[${button.type}]`)
				.join(' | ')
		};
	});

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
/**
 * Every request the page made, whatever its origin or method.
 *
 * The probe PLAN §10 asked for on the two register cases. Both witnesses here watch one origin and only `/api/…`
 * paths, so when a case died saying "the register route was never asked" the failure could not tell whether the
 * submit took another leg or never happened — while the mock's own log (`GET 127.0.0.1:3998/requests`) held this
 * app's whole server-side register chain (`POST /api/auth/register` → `login` → `tenant` → `organization` →
 * `employee` → `organization-projects` → `organization-team` → `refresh-token`) in the same minutes. A dump of the
 * browser's side is what settles that disagreement, so it is in the message now.
 */
const watchEveryRequest = (page: Page): (() => string[]) => {
	const seen: string[] = [];
	page.on('request', (request) => seen.push(`${request.method()} ${request.url()}`));
	return () => seen;
};

/** The asks of this app's register route, with the whole page dump behind them, as one pollable string. */
const registerAsks = (calls: AppApiCall[], everything: () => string[]): string =>
	`asks on /api/auth/register: [${appCallsMatching(calls, '/api/auth/register')
		.map((call) => `${call.method} ${call.path} → ${call.status || '(no answer yet)'}`)
		.join(', ')}] | every request the page made: ${JSON.stringify(everything())}`;

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
		const everything = watchEveryRequest(view);

		await view.locator('#signup-name').fill('Jane Cooper');
		await view.locator('#signup-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Continue', exact: true }).click();
		await view.getByText('With my team', { exact: true }).click();
		await view.locator('#signup-team').fill('Lane B Team');

		await view.getByRole('button', { name: 'Create my workspace' }).click();

		// Leg 1: the browser asked this app, once, and the body is the form.
		//
		// ⚠ Poll the witness, do not read it once. Measured in `lane-b-signup-forms-me1.log` on the same eight steps:
		// this case read the watcher 3.7 s after the click and saw `[]` while the case below it, a few hundred ms
		// slower to reach the same assertion, saw the `POST /api/auth/register`. `click()` resolves when the click has
		// been dispatched, not when the client has issued the request (`use-authentication-team.ts` → `authService
		// .registerUserTeam` → `getFallbackAPI()`, `auth.service.ts:275-278`, axios `baseURL = API_BASE_URL` =
		// `/api`, `constants.tsx:96`) — so a single read races the submit. The witness string carries the whole page
		// dump, so a red here still says what the page *did* ask.
		await expect
			.poll(() => registerAsks(calls(), everything), { timeout: 20_000 })
			.toContain('POST /api/auth/register →');

		const sent = appCallsMatching(calls(), '/api/auth/register');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the finished sign-up reached this app's register route ${sent.length} times, not once: ${registerAsks(
				calls(),
				everything
			)}`
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
		// Leg 2: the route accepted the body (its own `authFormValidate(['email','name','team'])` passed) and asked
		// Gauzy's path, recorded with this app's `/api` prefix on it (`serverFetch` fetches
		// `GAUZY_API_SERVER_URL + path`, `constants.tsx`, and `route-refusals.spec.ts` pins the same reading).
		//
		// ⚠ It is proved through the **last** ask of the chain, not through `/api/auth/register` itself. The mock's
		// log is a 10-entry ring (`apps/web/playwright/backend.mjs:40`, `MAX_REQUESTS = 10`, `/requests` returns
		// `requests.slice(-10)`) and this one request chains eight asks of its own — register, login, tenant,
		// organization, employee, organization-projects, organization-team, refresh-token — so the entry a witness
		// wants can be pushed out of the ring before any witness reads it. Two runs red exactly that line:
		// `lane-b-signup-forms-me2.log` (`Expected length: 1 / Received array: []` beside a mock log naming
		// `POST /api/auth/register → 200`) and `lane-b-signup-forms-me4.log` (same, polled). `POST
		// /api/organization-team` is asked by nothing else in a mock run, so seeing it says the register route ran
		// its Gauzy chain end to end.
		const chain = await mockWasAsked('/api/organization-team');
		expect(
			chain.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the register route never ran its Gauzy chain (no ${'/api/organization-team'} ask): ${describeMockLog(
				await mockRequests()
			)}`
		).not.toHaveLength(0);
	});

	test('a sign-up the mock answers leaves a half session: 200, the mock’s own access token, and no user id', async ({
		anon
	}) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);
		const everything = watchEveryRequest(view);

		await view.locator('#signup-name').fill('Jane Cooper');
		await view.locator('#signup-email').fill(MOCK_EMAIL);
		await view.getByRole('button', { name: 'Continue', exact: true }).click();
		await view.getByText('With my team', { exact: true }).click();
		await view.locator('#signup-team').fill('Lane B Team');
		// The answer is waited for from before the click: `waitForResponse` only catches a response that has not
		// finished yet, and `click()` returns when the click has landed, not when the client has posted.
		const registerAnswer = view.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/register', {
			timeout: 30_000
		});

		await view.getByRole('button', { name: 'Create my workspace' }).click();

		// What this app answers its own register route, measured on this mock — not the prediction PLAN §5 made.
		//
		// `app/api/auth/register/route.ts` registers, logs in, creates tenant / organization / employee / team, then
		// re-reads the token **from the refresh step**: `auth_token = refreshTokenRes.token` (route.ts:156-157), and
		// this mock answers `/api/auth/refresh-token` with a pair (`cypress/support/mock-gauzy-server.mjs:537-538`,
		// `{token:'synthetic-refreshed-token', refresh_token:'synthetic-refresh-token'}` — PLAN §3.1). The missing
		// `loginRes.token` therefore never reaches `setAuthCookies`: the chain completes and the route hands back the
		// bare `NextResponse` it made at route.ts:29 and returns at route.ts:175 → **HTTP 200, empty body**.
		// Measured twice 2026-11-22: in the browser (`lane-b-signup-forms-me2.log`: `Expected: 500 / Received: 200`)
		// and straight against this lane's own app (`curl -X POST 127.0.0.1:3032/api/auth/register`, headers saved at
		// `E:\Coding\.tmp\lane-b-register-probe-headers.txt`): `200` plus `auth-token=synthetic-refreshed-token`,
		// `auth-tenant-id`, `auth-organization-id`, `auth-active-team` and `auth-active-language=en`.
		//
		// What the mock cannot supply is the other half: its echo of `POST /auth/register` carries no user `id` and its
		// echo of the login no `refresh_token`, so `setAuthCookies` writes those two **empty** (same headers:
		// `auth-user-id=;`, `auth-refresh-token=`). A mock run cannot pin "a sign-up that failed left no session"; it
		// can pin the half session, and those two empties are the witness that it was never a real one.
		// Both the ask and its answer are polled before being read. `lane-b-signup-forms-me1.log` is why: this case
		// *did* find the one `POST /api/auth/register` (so the leg and the count are right) but its `status` was
		// `0` at the moment the assertion ran, because `watchAppApi` fills the status only when the response event
		// arrives — and `Test timeout of 180000ms exceeded` after that says the case then sat on the *next* two
		// assertions, not on this one. `stateOfTheForm` is read first, never inside the message (PLAN §9, the two
		// 3-minute outliers were messages that reached for a page state eagerly).
		const stateOfTheForm = await signupState(view).catch(() => '(the page would not report its state)');
		await expect
			.poll(() => registerAsks(calls(), everything), { timeout: 20_000 })
			.toContain('POST /api/auth/register →');
		await expect
			.poll(() => appCallsMatching(calls(), '/api/auth/register')[0]?.status ?? 0, { timeout: 60_000 })
			.not.toBe(0);

		const sent = appCallsMatching(calls(), '/api/auth/register');
		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the register route was asked ${sent.length} times, not once: ${describeAppCalls(
				calls()
			)} / the form held: ${JSON.stringify(stateOfTheForm)}`
		).toHaveLength(1);
		// The answer this app gave the browser, read off the response itself, and the cookies it wrote, off its own
		// `Set-Cookie` headers — before anything in the browser can change them.
		const answer = await registerAnswer;
		const writtenCookies = (await answer.headersArray())
			.filter((header) => header.name.toLowerCase() === 'set-cookie')
			.map((header) => header.value.split(';')[0]);

		expect(
			answer.status(),
			`this app answered its own register route with ${answer.status()}; the chain ends at route.ts:175 with the ` +
				`bare response it created at route.ts:29, because route.ts:156-157 takes the token from the refresh ` +
				`step, which this mock answers with a pair (mock-gauzy-server.mjs:537-538). Written cookies: ` +
				`${JSON.stringify(writtenCookies)}`
		).toBe(200);

		// The half session: an access token the mock minted, and the two fields its echoes do not carry written empty.
		expect(
			writtenCookies,
			`the register route did not write the half session measured 2026-11-22 (headers saved at ` +
				`E:\\Coding\\.tmp\\lane-b-register-probe-headers.txt): ${JSON.stringify(writtenCookies)}`
		).toEqual(
			expect.arrayContaining([
				'auth-token=synthetic-refreshed-token',
				'auth-user-id=',
				'auth-refresh-token='
			])
		);
	});
});
