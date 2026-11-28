import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockScenario } from '../../helpers';

/**
 * The sign-up page beyond its team form: `/auth/signup` (`app/[locale]/auth/signup/page.tsx` →
 * `core/components/pages/auth/signup/page-component.tsx` → `core/hooks/auth/use-authentication-team.ts`), on lane-c
 * (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control `4004`, Ever ID issuer `4005`,
 * `playwright/test-servers.ts:40`). `suites/lane-b/signup-forms.spec.ts` covers the team path (its eight cases); this
 * file drives the solo path, the prefills, the `1`/`2` keys, the Back button, the step counter and its scene, the
 * refused fields' `aria-invalid`, the captcha variant this lane renders, the page's links, and the Ever ID branch.
 *
 * ## Which layer is real and which is served
 *
 * **Nothing here is stubbed.** Every `page.route` a spec adds must sit on the mock origin, and this file adds none: the
 * one write the sign-up form makes is `POST /api/auth/register` on **this app's own origin**
 * (`core/services/client/api/auth/auth.service.ts:275-278` → `getFallbackAPI()`, whose axios `baseURL` is
 * `API_BASE_URL = '/api'` — `core/constants/config/constants.tsx:96`; the same witness as
 * `suites/lane-b/signup-forms.spec.ts:285-339`), and stubbing an app-origin route is out of bounds. The app's route
 * then calls Gauzy on the server (`core/services/server/requests`), and that leg is the lane's mock; the only thing
 * this file does to it is **arm a delay** through the mock's own switch (`scenario.delays` on
 * `cypress/support/mock-gauzy-server.mjs`, addressed by path, `playwright/helpers.ts:88-98` `MockScenario.delays`) so
 * the "creating your workspace" state can be read while it is really on screen.
 *
 * ## Where the numbers and the shapes came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-signupflow\probe1.spec.ts` … `probe4.spec.ts`, run on this lane on
 * 2026-11-28 (logs `probe1.log` 7 passed, `probe2.log` 3 passed + 1 probe-only failure of my own `evaluate` racing a
 * navigation, `probe3.log` 1 passed, `probe4.log` 2 passed). Every asserted value below is printed there: the step
 * counter copy and its two segments (`probe1.log` "P1 step1"), the reveal heights 0 closed / 72-104 open
 * (`probe1.log` "P2 …", `probe4.log` "P12 …"), the `aria-invalid` pairs, the prefill winner (`probe1.log` "P5"), the
 * register body `{"name","email","team","timezone"}` with the solo team `Jane Cooper's Team` (`probe2.log` "P3 calls",
 * "P10 register calls"), the loader copy and its timing — **4 943 ms with `delays: {'/api/auth/register': 4000}`,
 * 602 ms without** (`probe2.log` "P7 answer"/"P8 answer"), the landing chain `POST /api/auth/register 200` →
 * `GET / 307` → `GET /auth/passcode 200` (`probe3.log` "P11 documents"), and the Ever ID page's settled state with the
 * `410` answer (`probe2.log` "P9 …"). This file's own `[lane-c signupflow] MEASURE` lines re-measure the same on every
 * run.
 *
 * ## What this file cannot reach, and the line that blocks it
 *
 * - **The verify-email sent card** (`auth.signUp.SENT_TITLE` / `SENT_TEXT` / `AuthAddress` / `USE_ANOTHER_EMAIL`,
 *   `page-component.tsx:165-191`) needs the route's **201 `{verifyEmail:true}`**, which it answers only when Gauzy's
 *   register answer carries `isActive === false` (`app/api/auth/register/route.ts:101-105`). This mock has no register
 *   handler at all: an unmatched non-`GET` path is answered with the body it was sent
 *   (`cypress/support/mock-gauzy-server.mjs:893` `if (method !== 'GET') return body ?? { success: true };`), and that
 *   body is what this app built (`{password, confirmPassword, user:{firstName,lastName,email,timeZone},
 *   appEmailConfirmationUrl}` — `route.ts:86-96`) and never carries `isActive`. No mock scenario switch touches it: the
 *   switches `cypress/support/mock-gauzy-server.mjs` answers to are `delays, drops, everIdLogout, fails,
 *   tenantRegistrationClosed, newWorkspaceRefreshFails, notificationPreferences, notificationSettingFails,
 *   notifications, siteGrants, statsEnabledUi, timeLogs, timerRunning, workspacePaywall`.
 * - **A 400 with per-field `{errors}`** (`route.ts:41-50`, read back by `use-authentication-team.ts:291-293`, and the
 *   "the API answered about the name or the address after step 2, so show it where the field is" effect
 *   `page-component.tsx:93-97`): unreachable from the browser. The route validates the same three fields with the same
 *   helper the page already ran (`authFormValidate` at `use-authentication-team.ts:246`/`:257` vs `route.ts:41`), and
 *   the only field the route sees that the solo client never typed is `team`, which it derives from an already-valid
 *   name (`use-authentication-team.ts:267` → `core/lib/utils/default-team-name.ts:10`) and which that helper only
 *   refuses below two characters (`core/lib/helpers/validations.ts:35`). The captcha 400 (`route.ts:52-61`) needs
 *   `CAPTCHA_SECRET_KEY`, blank in `apps/web/.env`, with `NEXT_PUBLIC_CAPTCHA_SITE_KEY: ''` in the lane's own
 *   environment (`playwright/test-servers.ts:117`).
 * - **The Ever ID sign-up that has an identity**: `?ever_id=signup` with a handoff — the 200 prefill (name/email
 *   read-only, the document list, `SIGNUP_CHECKOUT`), `SIGNUP_CONFIRM_REQUIRED` and `SIGNUP_TERMS_REQUIRED` (both
 *   computed only from a prefill, `use-authentication-team.ts:145-148`), `TOO_MANY_ATTEMPTS` (its attempt budget is
 *   keyed per handoff, `app/api/auth/ever-id/signup-handoff/route.ts:105-108`), the 403 + `checkoutUrl` redirect
 *   (`use-authentication-team.ts:197-205`) and the 409/410 of a *used* key. The handoff cookie is written only by a
 *   completed Ever ID sign-in (`core/services/server/ever-id/sign-in.ts:273,285`), and the lane's fake issuer serves a
 *   discovery document, a JWKS and minted **logout** tokens only (`playwright/ever-id-idp.mjs:122-141`) — there is no
 *   `/authorize` and no token endpoint, so no sign-in can finish and no handoff can exist. What this file does drive is
 *   the missing-handoff answer: `410` → `pages.auth.everId.SIGNUP_EXPIRED` (`signup-handoff/route.ts:101-104` →
 *   `use-authentication-team.ts:31`).
 * - `navigateAfterSignIn()` is driven as far as the lane lets it: the full page load it starts is measured
 *   (`probe3.log`), but the account it created is the mock's half session (no user id, no login token — the chain
 *   written out in `suites/lane-b/signup-forms.spec.ts:362-427`), so the person is sent back to the sign-in page by
 *   the door's own denial (`proxy.ts:178-187`), not into a workspace. A board-return or a page set for the sign-in
 *   (`core/lib/auth/navigate-after-sign-in.ts:26-45`) is not reachable here.
 *
 * ## Notes that kept the assertions honest
 *
 * - `document.body.textContent` on a Next.js page carries the serialized flight payload, which names components
 *   (`probe4.log` "P13 step1 captcha" found the word `captcha` in it before any widget exists): nothing here searches
 *   page text for a component name.
 * - Right after `anon(…)` the page has not painted yet (`probe4.log` "P13" read an empty scene and no segment bar), so
 *   every read here starts from a locator that must appear first.
 * - The segment bar animates (`transition-colors duration-300`, `page-component.tsx:252`), so its two colours are
 *   compared with a poll, never as one read; the colours themselves are theme values and are never pinned — only
 *   "different from each other" and "equal to each other".
 * - `AuthScene` marks the whole scene `aria-hidden="true"` (`core/components/auth/scenes/scene-frame.tsx:30`), so the
 *   scenes are read by text inside `<aside>`, not by role.
 * - Dev Strict Mode mounts the page twice (`probe2.log` "P9 calls" recorded the Ever ID prefill read twice); a read
 *   that failed is never counted, only waited for.
 */

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	auth: {
		signUp: Record<string, string>;
		scene: Record<string, string>;
		field: Record<string, string>;
	};
	pages: { auth: Record<string, string> & { everId: Record<string, string> } };
	common: Record<string, string>;
};

const SIGN_UP = EN.auth.signUp;
const SCENE = EN.auth.scene;
const FIELD = EN.auth.field;
const PAGE_AUTH = EN.pages.auth;
const EVER_ID = EN.pages.auth.everId;
const CONTINUE = EN.common.CONTINUE; // "Continue"
const BACK = EN.common.BACK; // "Back"

/** `next-intl`'s `{name}` placeholders, filled the way the components fill them. */
const filled = (template: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

/** `TOTAL_STEPS` in `page-component.tsx:41`. */
const TOTAL_STEPS = 2;
const REGISTER_PATH = '/api/auth/register';
const EVER_ID_HANDOFF_PATH = '/api/auth/ever-id/signup-handoff';
/** `DEFAULT_MAIN_PATH = '/'` (`core/constants/config/constants.tsx:102`), the page `navigateAfterSignIn()` assigns. */
const HOME_PATH = '/';

/**
 * The client's own refusal copy — typed by the app, not by `locales/en.json`: `core/lib/helpers/validations.ts:23`
 * (`name`), `:35` (`team`), `:18` (`email`). `:29` (`recaptcha`) never renders on this lane: no site key, no widget
 * (`page-component.tsx:659-661`), and `recaptcha` is not in the validation list (`use-authentication-team.ts:244`).
 */
const NAME_ERROR = 'You must provide a valid Name';
const TEAM_ERROR = 'You must provide a valid Team Name';
const CAPTCHA_ERROR = 'Please check the ReCaptcha checkbox before continue';

/**
 * `defaultTeamNameOf` (`core/lib/utils/default-team-name.ts:6-11`) — quoted here as it is written there, because the
 * solo path's team is produced by that function and by nothing else. Every use of it in this file is cross-checked
 * against a value the **page** served (the scene preview or the loading card), so a drift in either direction is red.
 */
const soloTeamOf = (name: string): string => {
	const trimmedName = name.trim();
	if (!trimmedName) return 'My Team'; // default-team-name.ts:8
	return `${trimmedName}'s Team`; // default-team-name.ts:10
};

const NAME = 'Jane Cooper';
const SOLO_EMAIL = 'lane-c.solo@example.test';
const TEAM_EMAIL = 'lane-c.team@example.test';
const LAND_EMAIL = 'lane-c.land@example.test';
const LOCAL_STORAGE_EMAIL = 'lane-c.local-store@example.test';
const QUERY_EMAIL = 'lane-c.query-string@example.test';
const TEAM_NAME = 'Lane C Team';

/** Shell noise that is not this page's (`suites/lane-a/api-tokens-settings-ui.spec.ts:421-433`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The shell's own health read timing out on a lane dev server (`core/services/client/api/default.ts:42`, axios
 * `timeout: 30000` at `:17`): known lane noise, excused only as this whole line.
 */
const LANE_HEALTH_FLAKE = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';

const consoleFindings = (shield: Shield) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(LANE_HEALTH_FLAKE));

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-c signupflow] MEASURE ${label} ${JSON.stringify(value)}`);

/** The messages the page paints under a field, by the id the components give them. */
const fieldError = (view: Page, fieldId: string) => view.locator(`#${fieldId}-error`);

type AppApiCall = { method: string; path: string; status: number; body: unknown };

/**
 * What the browser really sent to **this app's own** `/api/...` routes, with the body it sent and the status this app
 * answered (`suites/lane-b/lane-auth-helpers.ts:350-379` is the same witness; the mock's log cannot show these).
 */
function watchAppApi(view: Page): () => AppApiCall[] {
	const calls: AppApiCall[] = [];
	const isAppApi = (url: URL) => url.origin === APP_ORIGIN && url.pathname.startsWith('/api/');
	view.on('request', (request) => {
		const url = new URL(request.url());
		if (!isAppApi(url)) return;
		const raw = request.postData();
		let body: unknown = null;
		if (raw !== null && raw !== undefined) {
			try {
				body = JSON.parse(raw);
			} catch {
				body = raw;
			}
		}
		calls.push({ method: request.method(), path: url.pathname, status: 0, body });
	});
	view.on('response', (response) => {
		const url = new URL(response.url());
		if (!isAppApi(url)) return;
		for (let index = calls.length - 1; index >= 0; index -= 1) {
			if (calls[index].path === url.pathname && calls[index].status === 0) {
				calls[index].status = response.status();
				break;
			}
		}
	});
	return () => calls;
}

const asksFor = (calls: AppApiCall[], path: string): AppApiCall[] => calls.filter((call) => call.path === path);

const describeAppCalls = (calls: AppApiCall[]): string =>
	calls.length === 0
		? 'nothing on /api'
		: calls.map((call) => `${call.method} ${call.path} → ${call.status || '(no answer yet)'}`).join(', ');

/** The register asks of the whole page as one pollable string (a red must say what the page *did* ask). */
const registerAsks = (calls: AppApiCall[]): string =>
	`asks on ${REGISTER_PATH}: [${asksFor(calls, REGISTER_PATH)
		.map((call) => `${call.method} ${call.path} → ${call.status || '(no answer yet)'}`)
		.join(', ')}] | every ask: ${describeAppCalls(calls)}`;

/**
 * The team field's reveal row: its height in CSS pixels and whether it is `inert` (`AuthReveal`, used the same way in
 * `suites/lane-b/signup-forms.spec.ts:208-219`). The height itself is layout-dependent (measured 0 closed, 72 after a
 * key, 80 after typing, 104 with an error line), so only `0` and "greater than 0" are asserted.
 */
const revealOf = (view: Page) =>
	view.evaluate(() => {
		const field = document.getElementById('signup-team');
		const reveal = field?.closest('[class*="grid-rows-"]') as HTMLElement | null;
		return reveal
			? { height: Math.round(reveal.getBoundingClientRect().height), inert: reveal.hasAttribute('inert') }
			: null;
	});

/** The step counter's segment bar: how many segments and what each is painted with right now. */
const segmentsOf = (view: Page) =>
	view.evaluate(() =>
		Array.from(document.querySelectorAll('div[aria-hidden="true"] > span[class*="h-1"]')).map(
			(segment) => getComputedStyle(segment).backgroundColor
		)
	);

/** The id of the element holding the focus (`''` when it is the page itself). */
const activeFieldId = (view: Page) =>
	view.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.id : ''));

/** The `input` names the form holds, radio inputs left out (they are the mode choice, not a field). */
const inputNames = (view: Page) =>
	view.evaluate(() =>
		Array.from(document.querySelectorAll('input'))
			.filter((input) => (input as HTMLInputElement).type !== 'radio')
			.map((input) => (input as HTMLInputElement).name)
			.filter((name) => name.length > 0)
			.sort()
	);

/** The `href`s on the page that name another machine, read from the anchors themselves. */
const offLaneHrefs = (view: Page, appOrigin: string) =>
	view.evaluate((origin) => {
		const hrefs = Array.from(document.querySelectorAll('a'))
			.map((anchor) => anchor.getAttribute('href'))
			.filter((href): href is string => Boolean(href));
		return hrefs.filter((href) => href.startsWith('http') && new URL(href).origin !== origin);
	}, appOrigin);

/** The step-1 fields this file fills, then the accepted first step. */
const openStep2 = async (view: Page, email: string) => {
	await view.locator('#signup-name').fill(NAME);
	await view.locator('#signup-email').fill(email);
	await view.getByRole('button', { name: CONTINUE, exact: true }).click({ timeout: 15_000 });
	await expect(
		view.getByRole('button', { name: SIGN_UP.GET_STARTED }),
		`the first step did not open the mode choice (its submit "${SIGN_UP.GET_STARTED}" is not on the page)`
	).toBeVisible();
};

test.describe('lane-c · the rest of the sign-up page', () => {
	test('the solo path sends a team named after the person, and the loading state names it', async ({
		anon,
		shield
	}) => {
		// Holds the mock's answer to this app's server-side register call (`scenario.delays`, addressed by path) so the
		// loading state is still on screen when this case reads it: measured 4 943 ms with 4 000 armed, 602 ms unarmed
		// (`probe2.log` "P7 answer", "P8 answer").
		await mockScenario({ delays: { [REGISTER_PATH]: 6_000 } });
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);

		await openStep2(view, SOLO_EMAIL);
		// Solo is the choice the form opens with, and its field is never opened or typed (measured in `probe4.log`
		// "P12 step2 solo": the reveal row is inert with height 0).
		await expect(
			view.getByRole('radio', { name: SIGN_UP.SOLO }),
			'the mode choice does not start on the solo path'
		).toBeChecked();
		const typedTeam = await view.locator('#signup-team').inputValue();

		const registerAnswer = view.waitForResponse((response) => new URL(response.url()).pathname === REGISTER_PATH, {
			timeout: 60_000
		});
		await view.getByRole('button', { name: SIGN_UP.GET_STARTED }).click({ timeout: 15_000 });

		await expect(
			view.getByRole('heading', { name: SIGN_UP.CREATING }),
			'a submitting sign-up shows no loading heading'
		).toBeVisible();
		// Poll the witness, do not read it once: `click()` resolves when the click landed, not when the client posted
		// (the same race `suites/lane-b/signup-forms.spec.ts:285-296` names).
		await expect.poll(() => registerAsks(calls()), { timeout: 20_000 }).toContain(`POST ${REGISTER_PATH}`);
		await expect(
			view.locator('[role="status"]').first(),
			'the loading state does not say which team is being set up'
		).toContainText(filled(SIGN_UP.CREATING_TEXT, { team: soloTeamOf(NAME) }));

		const answer = await registerAnswer;
		const sent = asksFor(calls(), REGISTER_PATH);
		const body = (sent[0]?.body ?? {}) as Record<string, unknown>;
		report('solo submit', {
			asks: sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			bodyKeys: Object.keys(body).sort(),
			answerStatus: answer.status()
		});

		expect(
			sent.map((call) => `${call.method} ${call.path} → ${call.status}`),
			`the solo sign-up reached this app's register route ${sent.length} times: ${registerAsks(calls())}`
		).toHaveLength(1);
		expect(body.name, `the register body carries name ${JSON.stringify(body.name)}`).toBe(NAME);
		expect(body.email, `the register body carries email ${JSON.stringify(body.email)}`).toBe(SOLO_EMAIL);
		// Nothing was typed in the team field, and the page never opened it; the team is the one the app names.
		expect(typedTeam, `the solo path typed something into the team field: ${JSON.stringify(typedTeam)}`).toBe('');
		expect(body.team, `the solo path sent team ${JSON.stringify(body.team)}`).toBe(soloTeamOf(NAME));
		expect(
			typeof body.timezone === 'string' && (body.timezone as string).trim().length > 0,
			`the register body carries no timezone: ${JSON.stringify(Object.keys(body).sort())}`
		).toBe(true);
		// This lane renders no captcha (see the captcha case) and the form has no password.
		expect(
			'recaptcha' in body,
			`the sign-up body carries a recaptcha field: ${JSON.stringify(Object.keys(body).sort())}`
		).toBe(false);
		expect(
			'password' in body,
			`the sign-up body carries a password: ${JSON.stringify(Object.keys(body).sort())}`
		).toBe(false);
		expect(
			answer.status(),
			`this app answered its own register route with ${answer.status()}; the mock's echo of the register call carries ` +
				'no `isActive`, so the 201 `verifyEmail` branch (route.ts:101) is not taken and the chain ends at route.ts:175'
		).toBe(200);

		expect(
			consoleFindings(shield),
			`console errors on the solo path: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('a sign-up this app answers leaves the person on the sign-in page, by the redirect the door served', async ({
		anon,
		shield
	}) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);
		const documents: Array<{ path: string; status: number; location: string | null }> = [];
		view.on('response', (response) => {
			if (response.request().resourceType() !== 'document') return;
			documents.push({
				path: new URL(response.url()).pathname,
				status: response.status(),
				location: response.headers()['location'] ?? null
			});
		});

		await openStep2(view, LAND_EMAIL);
		const registerAnswer = view.waitForResponse((response) => new URL(response.url()).pathname === REGISTER_PATH, {
			timeout: 60_000
		});
		await view.getByRole('button', { name: SIGN_UP.GET_STARTED }).click({ timeout: 15_000 });
		const answer = await registerAnswer;
		expect(
			answer.status(),
			`the register route answered ${answer.status()}, not the 200 the mock chain ends with`
		).toBe(200);

		// `navigateAfterSignIn()` is a full page load (`core/lib/auth/navigate-after-sign-in.ts:26-45`): the sign-up page
		// is replaced, and where the person ends up is the door's own answer, not this file's guess — the home page is
		// denied to a session the mock could only half fill, and the door says so with a 307 and its `Location`
		// (`proxy.ts:178-187`). Both are read from what the browser was answered.
		await expect
			.poll(() => documents.filter((document) => document.status === 307).length, { timeout: 30_000 })
			.toBe(1);
		const redirect = documents.find((document) => document.status === 307) as {
			path: string;
			status: number;
			location: string | null;
		};
		const landedPathname = new URL(redirect.location as string, APP_ORIGIN).pathname;
		// The document that was redirected is the home page the client asked for (`window.location.assign('/')`,
		// `navigate-after-sign-in.ts:47`; `DEFAULT_MAIN_PATH = '/'`, `constants.tsx:102`).
		expect(
			`${redirect.path} ${redirect.status}`,
			`the 307 came from ${redirect.path}, not from the home page; the documents were ${JSON.stringify(documents)}`
		).toBe(`${HOME_PATH} 307`);
		report('after the created account', { documents, finalUrl: view.url(), landedPathname });
		await expect.poll(() => new URL(view.url()).pathname, { timeout: 30_000 }).toBe(landedPathname);
		expect(
			asksFor(calls(), REGISTER_PATH).length,
			`the sign-up was sent ${asksFor(calls(), REGISTER_PATH).length} times: ${registerAsks(calls())}`
		).toBe(1);

		expect(
			consoleFindings(shield),
			`console errors after landing on the sign-in page: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('an address is already typed when the link carries it or the browser kept it, and the link wins', async ({
		anon,
		shield
	}) => {
		// `use-authentication-team.ts:57-68`: `query?.get('email') || localStorage.getItem('ever-teams-start-email') || ''`
		// — read at render, which is how a person refused at sign-in arrives here without retyping.
		const view = await anon('/auth/signup');
		await view.locator('#signup-email').waitFor({ state: 'visible', timeout: 30_000 });
		await view.evaluate((value) => localStorage.setItem('ever-teams-start-email', value), LOCAL_STORAGE_EMAIL);

		await anon('/auth/signup');
		const fromLocalStorage = await view.locator('#signup-email').inputValue();
		await expect(
			view.locator('#signup-email'),
			`the address kept in localStorage did not reach the form (the field was read as ${JSON.stringify(
				fromLocalStorage
			)})`
		).toHaveValue(LOCAL_STORAGE_EMAIL);

		await anon(`/auth/signup?email=${QUERY_EMAIL}`);
		const fromQuery = await view.locator('#signup-email').inputValue();
		await expect(
			view.locator('#signup-email'),
			`?email= did not win over the address in localStorage (the field was read as ${JSON.stringify(fromQuery)})`
		).toHaveValue(QUERY_EMAIL);
		await expect(view.locator('#signup-name'), 'a prefilled address also filled the name field').toHaveValue('');

		expect(
			consoleFindings(shield),
			`console errors on the prefilled page: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('keys 1 and 2 pick how you start, and typing 1 or 2 in a field is only typing', async ({ anon, shield }) => {
		const view = await anon('/auth/signup');
		await openStep2(view, SOLO_EMAIL);
		const solo = view.getByRole('radio', { name: SIGN_UP.SOLO });
		const team = view.getByRole('radio', { name: SIGN_UP.TEAM });
		await expect(solo, 'the mode choice does not start on the solo path').toBeChecked();

		// `MODE_BY_KEY` + the window keydown listener (`page-component.tsx:430-499`).
		await view.keyboard.press('2');
		await expect(team, 'the key 2 did not choose "with my team"').toBeChecked();
		await expect(solo, 'the key 2 left the solo choice checked as well').not.toBeChecked();
		await expect.poll(async () => (await revealOf(view))?.height, { timeout: 10_000 }).toBeGreaterThan(0);
		await expect.poll(async () => (await revealOf(view))?.inert, { timeout: 10_000 }).toBe(false);
		// A key does not move the focus onto the team field (`chooseMode` only focuses on a pointer pick,
		// `page-component.tsx:512-519`; measured `probe4.log` "P12 after key 2").
		expect(
			await activeFieldId(view),
			'the key 2 moved the focus onto the team field, which is what only a click does'
		).not.toBe('signup-team');

		await view.keyboard.press('1');
		await expect(solo, 'the key 1 did not choose "on my own"').toBeChecked();
		await expect.poll(async () => (await revealOf(view))?.height, { timeout: 10_000 }).toBe(0);
		await expect.poll(async () => (await revealOf(view))?.inert, { timeout: 10_000 }).toBe(true);

		// Typing into a field is never a shortcut: `isTypingTarget` / the early return (`page-component.tsx:435-441`,
		// `:490-492`). `locator.press()` puts the focus on the field first.
		await view.keyboard.press('2');
		await expect(team, 'the team choice is not open, so the field cannot be typed into').toBeChecked();
		await view.locator('#signup-team').press('1');
		await expect(view.locator('#signup-team'), 'typing 1 in the team field did not type it').toHaveValue('1');
		await expect(
			team,
			'typing 1 while the team field had the focus switched the mode away from the team path'
		).toBeChecked();
		report('keys', { radios: [await solo.isChecked(), await team.isChecked()], reveal: await revealOf(view) });

		expect(
			consoleFindings(shield),
			`console errors while using the keys: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('Back returns to the first step with what was typed still there', async ({ anon, shield }) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);
		await openStep2(view, SOLO_EMAIL);

		await view.getByRole('button', { name: BACK, exact: true }).click({ timeout: 15_000 });

		await expect(
			view.getByRole('button', { name: CONTINUE, exact: true }),
			'Back did not bring back the first step (its Continue button is not on the page)'
		).toBeVisible();
		await expect(
			view.getByText(filled(SIGN_UP.STEP, { step: 1, total: TOTAL_STEPS }), { exact: true }),
			`the step counter does not read "${filled(SIGN_UP.STEP, { step: 1, total: TOTAL_STEPS })}" after Back`
		).toBeVisible();
		await expect(view.locator('#signup-name'), 'Back threw away the name that was typed').toHaveValue(NAME);
		await expect(view.locator('#signup-email'), 'Back threw away the address that was typed').toHaveValue(
			SOLO_EMAIL
		);
		// The mode choice is unmounted on the first step (`page-component.tsx:216-228`).
		await expect(
			view.getByRole('radio', { name: new RegExp(`${SIGN_UP.SOLO}|${SIGN_UP.TEAM}`) }),
			'the mode choice is still on the page after Back'
		).toHaveCount(0);
		// Back is not a submit: the positive signal above (the first step on screen) is what this absence is read from.
		expect(asksFor(calls(), REGISTER_PATH), `Back asked this app something: ${describeAppCalls(calls())}`).toEqual(
			[]
		);

		expect(consoleFindings(shield), `console errors after Back: ${JSON.stringify(shield.consoleErrors())}`).toEqual(
			[]
		);
	});

	test('the step counter and the scene beside it name the step, and the solo team is previewed', async ({
		anon,
		shield
	}) => {
		const view = await anon('/auth/signup');
		await view.locator('#signup-email').waitFor({ state: 'visible', timeout: 30_000 });

		await expect(
			view.getByText(filled(SIGN_UP.STEP, { step: 1, total: TOTAL_STEPS }), { exact: true }),
			`the first step does not read "${filled(SIGN_UP.STEP, { step: 1, total: TOTAL_STEPS })}"`
		).toBeVisible();
		// `StepCounter` draws `TOTAL_STEPS` segments and fills the ones up to the current step
		// (`page-component.tsx:238-258`). The colours are theme values: only "not the same" / "the same" is pinned.
		await expect.poll(() => segmentsOf(view), { timeout: 10_000 }).toHaveLength(TOTAL_STEPS);
		await expect
			.poll(
				async () => {
					const colors = await segmentsOf(view);
					return colors.length === TOTAL_STEPS && colors[0] !== colors[TOTAL_STEPS - 1];
				},
				{ timeout: 10_000 }
			)
			.toBe(true);
		const aside = view.locator('aside');
		await expect(
			aside.getByText(SCENE.ACCOUNT_TITLE, { exact: true }),
			`the first step shows no "${SCENE.ACCOUNT_TITLE}" scene`
		).toBeVisible();
		await expect(
			aside.getByText(SCENE.TEAM_TITLE, { exact: true }),
			'the team scene is already on the first step'
		).toHaveCount(0);

		await view.locator('#signup-name').fill(NAME);
		await view.locator('#signup-email').fill(SOLO_EMAIL);
		await view.getByRole('button', { name: CONTINUE, exact: true }).click({ timeout: 15_000 });
		await expect(
			view.getByText(filled(SIGN_UP.STEP, { step: TOTAL_STEPS, total: TOTAL_STEPS }), { exact: true }),
			`step two does not read "${filled(SIGN_UP.STEP, { step: TOTAL_STEPS, total: TOTAL_STEPS })}"`
		).toBeVisible();
		await expect
			.poll(
				async () => {
					const colors = await segmentsOf(view);
					return colors.length === TOTAL_STEPS && colors[0] === colors[TOTAL_STEPS - 1];
				},
				{ timeout: 15_000 }
			)
			.toBe(true);
		await expect(
			aside.getByText(SCENE.TEAM_TITLE, { exact: true }),
			`step two shows no "${SCENE.TEAM_TITLE}" scene`
		).toBeVisible();
		// `teamNameOf` hands the solo path's generated name to the scene (`page-component.tsx:59-64`, `:124`, `:137-144`).
		// The name is printed **twice** by the scene itself — once on the team's tile (`EntityTile name`,
		// `auth-scenes.tsx:331`) and once as the line beside it (`SceneText text`, `:333-336`) — measured in
		// `probe3.log` "P11 aside text", so the case reads the first of the two, as `suites/lane-b/signup-forms.spec.ts:185-196`
		// does for its duplicated heading.
		const soloPreview = await aside.innerText();
		await expect(
			aside.getByText(soloTeamOf(NAME), { exact: true }).first(),
			`the team scene does not preview the solo team (the aside holds ${JSON.stringify(soloPreview)})`
		).toBeVisible();
		// … and it follows the name the person types when they choose the team path (`TeamScene` `teamName`,
		// `auth-scenes.tsx:309-330`).
		await view.getByText(SIGN_UP.TEAM, { exact: true }).click({ timeout: 15_000 });
		await expect(
			view.getByRole('radio', { name: SIGN_UP.TEAM }),
			'clicking the team choice did not check its radio'
		).toBeChecked();
		await view.getByLabel(FIELD.TEAM_LABEL, { exact: true }).fill(TEAM_NAME);
		const teamPreview = await aside.innerText();
		await expect(
			aside.getByText(TEAM_NAME, { exact: true }).first(),
			`the team scene does not preview the typed team name (the aside holds ${JSON.stringify(teamPreview)})`
		).toBeVisible();
		report('step bar on step 2', { colors: await segmentsOf(view) });

		expect(
			consoleFindings(shield),
			`console errors on the step counter case: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('each refused field carries its own message and aria-invalid, and switching the mode clears the team one', async ({
		anon,
		shield
	}) => {
		const view = await anon('/auth/signup');
		const calls = watchAppApi(view);
		const asksBefore = registerAsks(calls());

		await view.locator('#signup-name').fill('J');
		await view.locator('#signup-email').fill(SOLO_EMAIL);
		await view.getByRole('button', { name: CONTINUE, exact: true }).click({ timeout: 15_000 });
		await expect(
			fieldError(view, 'signup-name'),
			'a one-character name produced no error line under the name field'
		).toContainText(NAME_ERROR);
		await expect(view.locator('#signup-name'), 'a refused name was not given aria-invalid').toHaveAttribute(
			'aria-invalid',
			'true'
		);
		await expect(fieldError(view, 'signup-email'), 'a valid address was refused as well').toHaveCount(0);

		await view.locator('#signup-name').fill(NAME);
		await view.getByRole('button', { name: CONTINUE, exact: true }).click({ timeout: 15_000 });
		await view.getByText(SIGN_UP.TEAM, { exact: true }).click({ timeout: 15_000 });
		await expect(view.getByRole('radio', { name: SIGN_UP.TEAM })).toBeChecked();
		await view.locator('#signup-team').fill('A');
		await view.getByRole('button', { name: SIGN_UP.GET_STARTED }).click({ timeout: 15_000 });
		await expect(
			fieldError(view, 'signup-team'),
			'a one-character team name produced no error line under the team field'
		).toContainText(TEAM_ERROR);
		await expect(view.locator('#signup-team'), 'a refused team name was not given aria-invalid').toHaveAttribute(
			'aria-invalid',
			'true'
		);
		await expect(
			view.getByRole('button', { name: SIGN_UP.GET_STARTED }),
			'the form submitted although the team name was refused'
		).toBeVisible();

		// Switching the mode clears the team error (`handleStartModeChange`, `use-authentication-team.ts:312-316`).
		await view.getByText(SIGN_UP.SOLO, { exact: true }).click({ timeout: 15_000 });
		await expect(
			fieldError(view, 'signup-team'),
			'switching to the solo path left the team error on the field'
		).toHaveCount(0);
		await expect(
			view.locator('#signup-team'),
			'the team field still carries aria-invalid after the mode switch'
		).not.toHaveAttribute('aria-invalid', 'true');
		report('refusals', { nameError: NAME_ERROR, teamError: TEAM_ERROR, clearedByModeSwitch: true });

		// Neither refusal was a submit: the witness is read after both error lines were seen on screen.
		expect(
			asksFor(calls(), REGISTER_PATH),
			`a refused form still reached this app's register route: ${registerAsks(calls())} (before: ${asksBefore})`
		).toEqual([]);

		expect(
			consoleFindings(shield),
			`console errors on the refusal case: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('this lane renders no captcha at all: no site key, no widget, no captcha field in the body', async ({
		anon,
		shield
	}) => {
		const view = await anon('/auth/signup');
		await view.locator('#signup-email').waitFor({ state: 'visible', timeout: 30_000 });

		// Read from where the lane serves them: the runtime payload the layout writes into `<html>`
		// (`app/[locale]/layout.tsx` → `readRuntimeEnv`), which is what `RECAPTCHA_SITE_KEY`/`CAPTCHA_TYPE` read
		// (`core/constants/config/constants.tsx:183`, `:188`). Only the two keys this case is about are read.
		const servedCaptchaEnv = await view.evaluate(() => {
			const raw = document.documentElement.getAttribute('data-ever-teams-runtime-env');
			const payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
			return {
				siteKey: payload['NEXT_PUBLIC_CAPTCHA_SITE_KEY'],
				type: payload['NEXT_PUBLIC_CAPTCHA_TYPE']
			};
		});
		report('captcha env as served', servedCaptchaEnv);
		expect(
			servedCaptchaEnv.siteKey,
			`the lane serves a captcha site key (${JSON.stringify(servedCaptchaEnv.siteKey)}), so this case's "no widget" is wrong`
		).toBe('');

		// `renderCaptcha` (`page-component.tsx:294-317`) switches on `CAPTCHA_TYPE`, whose default is `ReCAPTCHA`, and
		// `ReCAPTCHA` returns null without a site key (`:659-661`). Measured consequence on both steps: no iframe (the
		// provider widget is always a frame) and no captcha control in the form.
		await expect(view.locator('iframe'), 'step 1 rendered a captcha frame').toHaveCount(0);
		const firstStepNames = await inputNames(view);
		expect(
			firstStepNames,
			`step 1 offers the fields ${JSON.stringify(firstStepNames)}, which is not just the name and the address`
		).toEqual(['email', 'name']);

		await openStep2(view, TEAM_EMAIL);
		await expect(view.locator('iframe'), 'step 2 rendered a captcha frame').toHaveCount(0);
		const secondStepNames = await inputNames(view);
		expect(
			secondStepNames,
			`step 2 offers the fields ${JSON.stringify(secondStepNames)} — a captcha control would be one of them`
		).toEqual(['email', 'name', 'team']);
		// The copy of a captcha refusal (`validations.ts:29`) never appears, because no captcha is ever asked. Read
		// inside `<main>` (the auth card, `auth-layout.tsx:193`): the serialized flight payload in the document body
		// carries translated copy and component names of its own (`probe4.log` "P13 step1 captcha").
		await expect(
			view.locator('main').getByText(CAPTCHA_ERROR, { exact: false }),
			'a captcha message is on the page although no captcha was rendered'
		).toHaveCount(0);

		expect(
			consoleFindings(shield),
			`console errors on the captcha case: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('the page links stay on this app, and the off-lane ones are never requested', async ({ anon, shield }) => {
		const view = await anon('/auth/signup');
		await view.locator('#signup-email').waitFor({ state: 'visible', timeout: 30_000 });

		// `AuthLayout`'s header link (`page-component.tsx:158-161` → `auth-layout.tsx:232-235`): the prompt plus the link.
		await expect(
			view.getByText(SIGN_UP.HAVE_ACCOUNT, { exact: true }),
			`the header does not ask "${SIGN_UP.HAVE_ACCOUNT}"`
		).toBeVisible();
		const headerLink = view.getByRole('link', { name: SIGN_UP.SIGN_IN, exact: true });
		await expect(headerLink, 'the header offers no sign-in link').toBeVisible();
		// Both links are built from `DEFAULT_APP_PATH` (`constants.tsx:98-101`, used at `page-component.tsx:161` and
		// `:454`), so the header link is compared with the hint under the address field rather than with a typed path.
		const hintLink = view.getByRole('link', { name: PAGE_AUTH.SIGN_IN_INSTEAD, exact: true });
		const headerHref = await headerLink.getAttribute('href');
		const hintHref = await hintLink.getAttribute('href');
		report('header link', { headerHref, hintHref });
		expect(hintHref, `the hint under the address has no href (${JSON.stringify(hintHref)})`).toBeTruthy();
		expect(headerHref, `the header link's href is ${JSON.stringify(headerHref)}`).toBe(hintHref);
		expect(
			new URL(headerHref as string, APP_ORIGIN).origin,
			`the header link leaves this lane: ${JSON.stringify(headerHref)}`
		).toBe(APP_ORIGIN);

		// The footer links are off-lane, and this file never clicks or navigates to them: the witness is the shield,
		// which fails the test on any request that left the machine (`playwright/fixtures.ts:95-100, 122-125`).
		await expect
			.poll(async () => (await offLaneHrefs(view, APP_ORIGIN)).length, { timeout: 10_000 })
			.toBeGreaterThan(0);
		const offLane = await offLaneHrefs(view, APP_ORIGIN);
		report('off-lane hrefs', {
			count: offLane.length,
			origins: [...new Set(offLane.map((href) => new URL(href).origin))]
		});
		// 3 s of quiet: what it proves is that the page asked nothing off the machine, not that something did.
		await view.waitForTimeout(3_000);
		expect(
			shield.externalCalls(),
			`the sign-up page asked something outside this machine: ${JSON.stringify(shield.externalCalls())}`
		).toEqual([]);

		expect(
			consoleFindings(shield),
			`console errors on the links case: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('an Ever ID sign-up with no Ever ID in this browser says so, and asks nothing else', async ({
		anon,
		shield
	}) => {
		const view = await anon(`/auth/signup?ever_id=signup`);
		const calls = watchAppApi(view);

		// The page reads the identity from this app's own route (`ever-id.service.ts` `signupPrefill` →
		// `API_BASE_URL` = `/api`); without the sealed cookie of a finished Ever ID sign-in that route answers 410 and
		// drops the cookie (`app/api/auth/ever-id/signup-handoff/route.ts:101-104`).
		await expect
			.poll(() => asksFor(calls(), EVER_ID_HANDOFF_PATH).filter((call) => call.status === 410).length, {
				timeout: 30_000
			})
			.toBeGreaterThan(0);
		// The count of a read the page mounts twice in dev is not pinned (`probe2.log` recorded it twice); only "every
		// answer that came back was this one" is.
		const answeredStatuses = asksFor(calls(), EVER_ID_HANDOFF_PATH)
			.filter((call) => call.status !== 0)
			.map((call) => call.status);
		report('ever id prefill asks', { statuses: answeredStatuses, asks: describeAppCalls(calls()) });
		expect(
			[...new Set(answeredStatuses)],
			`the Ever ID prefill read was answered with something other than 410: ${describeAppCalls(calls())}`
		).toEqual([410]);

		const expired = EVER_ID.SIGNUP_EXPIRED;
		await expect(
			view.getByText(expired, { exact: true }),
			`an Ever ID sign-up with no key does not say "${expired}"`
		).toBeVisible();
		await expect(
			view.getByText(EVER_ID.SIGNUP_HINT, { exact: true }),
			`the Ever ID confirmation does not carry "${EVER_ID.SIGNUP_HINT}"`
		).toBeVisible();
		await expect(
			view.getByText(EVER_ID.SIGNUP_CONFIRM, { exact: true }),
			`there is no "${EVER_ID.SIGNUP_CONFIRM}" to tick`
		).toBeVisible();
		// Nothing to confirm against: the box is disabled and unchecked (`page-component.tsx:607-613`).
		const confirmBox = view.locator('[role="checkbox"]');
		await expect(confirmBox, 'the Ever ID confirmation renders no checkbox').toHaveCount(1);
		await expect(
			confirmBox,
			'the Ever ID confirmation box can be ticked although there is no identity to confirm'
		).toHaveAttribute('aria-disabled', 'true');
		await expect(confirmBox, 'the Ever ID confirmation box starts ticked').toHaveAttribute('aria-checked', 'false');
		// The address is the Ever ID's own (read-only even though the identity is gone, `FillUserDataForm`
		// `isEmailLocked` `page-component.tsx:283`); the name stays the person's to type once the read settled
		// (`isNameLocked` `:282`, which is true only while the read is running or the name was verified).
		await expect(view.locator('#signup-email'), 'the Ever ID address is not read-only').toHaveAttribute('readonly');
		await expect(
			view.locator('#signup-name'),
			'the name field is locked to an Ever ID name the server never sent'
		).not.toHaveAttribute('readonly');
		// The usual hint under the address is not shown on this branch (`hintUnderEmail`, `page-component.tsx:281`).
		await expect(
			view.getByText(PAGE_AUTH.EXISTING_ACCOUNT_HINT, { exact: true }),
			'the Ever ID page still shows the "already have an account" hint'
		).toHaveCount(0);

		// Submitting now is refused before anything leaves the page: `everIdStepErrors` answers with the prefill error
		// while there is no prefill (`use-authentication-team.ts:140-149`), and `handleSubmit` returns on it (`:233-237`).
		await view.getByRole('button', { name: CONTINUE, exact: true }).click({ timeout: 15_000 });
		await expect(
			view.getByText(expired, { exact: true }),
			'Continue on a failed Ever ID prefill lost the message that explains why nothing happened'
		).toBeVisible();
		// 2 s of quiet: it proves no register or prefill POST followed that click.
		await view.waitForTimeout(2_000);
		expect(
			asksFor(calls(), REGISTER_PATH),
			`Continue on a failed Ever ID prefill still submitted: ${registerAsks(calls())}`
		).toEqual([]);

		expect(
			consoleFindings(shield),
			`console errors on the Ever ID sign-up page: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});
});
