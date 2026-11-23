import { expect, test, type Page } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Settings › Profile and the e-mail verification panel, pinned on lane-a (app 3031, mock 3992) on 2026-11-23. Every
 * string, URL and count below was read out of the code and then measured in this file's own runs
 * (`E:\Coding\.tmp\s2-lane-a-evp-1.log` onward); each `MEASURE` line below prints what the page and the network
 * actually did, so the numbers in the assertions can be re-checked against the log.
 *
 * ## The code this file measures (each line read out of the file before it is named)
 *
 * - `core/lib/auth/email-verification.ts`: `asksForEmailVerification` is true only for an unverified user **and** a
 *   status that says so (`:36-42`, i.e. `state?.isEmailVerified === false`); `wasVerificationEmailSent` is
 *   `state?.verificationEmailSent === true` (`:45-47`); `isEmailVerificationSatisfied` lets a `null` state through
 *   (`:25-27`), which is the deployment that verifies no address.
 * - `core/hooks/auth/use-email-verification-status.ts`: the status query is `enabled` only while the user is
 *   unverified (`:31`, `:35`), so a verified person never causes the call; `UNREADABLE_STATUS = { isEmailVerified: false }`
 *   is returned only when the query errored and has no data yet (`:23`, `:38-41`).
 * - `core/services/client/api/users/emails/email-verification.service.ts`: the status ask is `GET '/auth/email/verify/status'`
 *   when `GAUZY_API_BASE_SERVER_URL.value` is set (`:30`) and a 404 is answered `null` (`:40-42`); the panel's send-code
 *   action goes through `authService.resendVerifyUserLink` (`core/services/client/api/auth/auth.service.ts:157-177`,
 *   `POST '/auth/email/verify/resend-link'` in the same direct branch), which `useAccountEmail` calls for the panel
 *   (`core/hooks/settings/use-account-email.ts:32-44`, `:74-79`) and which invalidates the status query on success
 *   (`:35-42`).
 * - `core/constants/config/constants.tsx:229` gives `GAUZY_API_BASE_SERVER_URL` from `NEXT_PUBLIC_GAUZY_API_SERVER_URL`,
 *   which `playwright/test-servers.ts:109` sets to the mock origin; `core/services/client/axios.ts:108-112` then makes
 *   the browser's base `<mock origin>/api`. So on a lane all three calls leave the browser for the mock directly —
 *   measured below from the browser's own request log, not assumed.
 * - `core/components/settings/pages/profile/email-row.tsx`: the panel is rendered only when `step === 'read'` and
 *   `asksForVerification` (`:91`, `:310-320`), the row's chip comes from the user alone (`VerificationChip`, `:44-61`,
 *   used at `:298`), and `codeWasSent` is the status's `verificationEmailSent` (`:90`).
 * - `core/components/settings/pages/profile/email-verification-panel.tsx`: `saysCodeWasSent = codeWasSent || hasSentCode`
 *   (`:49`), so a code this panel sent keeps its own text even if a later status read says otherwise; the text is
 *   `settings.profile.VERIFY_TEXT` when a code was sent and `notifications.NOTICES.VERIFY_TEXT_NOT_SENT` otherwise
 *   (`:25-32`); the title is `notifications.NOTICES.VERIFY_TITLE` (`:97`); the send button is
 *   `notifications.NOTICES.VERIFY_RESEND` (`:124-131`) and its success message `settings.profile.VERIFY_SENT` (`:85-86`).
 * - `app/[locale]/page-component.tsx:69`, `:119-124`: the home page is the other consumer of the same status and shows
 *   `UnverifiedEmail` there, whose line is `notifications.NOTICES.VERIFY_TEXT` / `..._NOT_SENT`
 *   (`core/components/common/unverified-email.tsx:122-141`) — the last test pins that banner, because a lane page load
 *   reaches `/` too.
 * - The English strings, from `locales/en.json` (the `notifications.NOTICES` block starts at `:4277`, the
 *   `settings.profile` block at `:5636`): `notifications.NOTICES.VERIFY_TITLE` (`:4283`),
 *   `notifications.NOTICES.VERIFY_TEXT` (`:4284`), `notifications.NOTICES.VERIFY_TEXT_NOT_SENT` (`:4286`),
 *   `notifications.NOTICES.VERIFY_RESEND` (`:4289`), `settings.profile.VERIFY_TEXT` (`:5673`),
 *   `settings.profile.VERIFY_SENT` (`:5677`), `settings.profile.EMAIL_VERIFIED` / `EMAIL_NOT_VERIFIED`.
 *
 * **What the brief expected and what the app actually does** (measured, and pinned as measured): the panel's
 * "a code was sent" sentence is `settings.profile.VERIFY_TEXT` = "Enter the code we sent to {email} to confirm the
 * address is yours." — not `notifications.NOTICES.VERIFY_TEXT` ("We sent a code to {email}."), which is the home page
 * banner's sentence. Only the home-page banner says "We sent a code to …"; Settings › Profile says "Enter the code we
 * sent to …". See the last two tests.
 *
 * ## Why the stubs are built the way they are
 *
 * The lane mock's users are always verified (`cypress/support/mock-gauzy-server.mjs:91`, `:108`, `:119`; `/api/user/me`
 * is answered at `:415` and `:544`), so nothing on this lane shows the panel by itself, and the mock has **no handler**
 * for `/api/auth/email/verify/status`: its fall-through for a GET path it does not know is `pagination([])`
 * (`cypress/support/mock-gauzy-server.mjs:806`, `pagination` at `:9`), which `emailVerificationStatusSchema`
 * (`core/types/schemas/auth/email-verification.schema.ts:24-27`) would reject — so the status has to be answered by
 * this spec. The user is stubbed by taking the mock's real answer and changing only `isEmailVerified`, so every other
 * field the page reads stays the lane's own.
 *
 * All three calls are cross-origin (page on `http://localhost:3031`, API on `http://127.0.0.1:3992`), so an answer this
 * spec writes itself must carry the same CORS headers the mock writes (`mock-gauzy-server.mjs:997-1006`), or the browser
 * discards it and the request becomes an error — which would silently turn case 2 and 3 into the outage case. The
 * headers below restate the mock's own set rather than copying them off a fetched response: Playwright keeps the
 * fetched response's `content-length` when `route.fulfill` is given a new body, and a stale length is a broken response.
 * A non-GET on a stubbed path is handed to the mock (`route.fallback()`), which answers an `OPTIONS` 204 with exactly
 * those headers (`mock-gauzy-server.mjs:1007-1011`).
 *
 * ## Measured on this lane before any number below was written down (`s2-lane-a-evp-1.log`)
 *
 * - The three calls, each read off the browser's own request log:
 *   `GET http://127.0.0.1:3992/api/user/me?relations%5B0%5D=role&relations%5B1%5D=tenant&includeEmployee=true`,
 *   `GET http://127.0.0.1:3992/api/auth/email/verify/status` (no query at all) and
 *   `POST http://127.0.0.1:3992/api/auth/email/verify/resend-link`. All three go to the mock origin directly, so this
 *   app's own status route handler is not in the lane's browser path at all.
 * - Not one CORS preflight was recorded for any of the three paths, in any case (`preflights 0` on every MEASURE line).
 *   The `route.fallback()` branch therefore never fires on this lane; it is the guard, not the path.
 * - One status ask per unverified document (cases 2 to 5 measured `status asks 1` in every run; case 8 measured 2, its
 *   own profile visit plus the home page) even though a dozen components read that status: they share one TanStack
 *   Query key. The two cases that ask more are the outage (3 asks in `…evp-1.log`, 2 in `…evp-2.log`, every one answered
 *   500 — the failed query retried) and the send (2 → 3 asks in the first run, 1 → 2 in the second: the invalidation
 *   that follows the POST). Those two counts are therefore pinned only as "at least one" and as "it grew after the
 *   click": the exact number of asks is not a stable fact here, because `next dev` mounts every component twice and
 *   the first fetch of a query is canceled — the noise `playwright/helpers.ts:37-43` names for the same reason.
 * - The verified control asked the status path 0 times, which is what `useEmailVerificationStatus` promises.
 */

/**
 * Settings › Profile: `app/[locale]/(main)/settings/personal/page.tsx:1`, `:4` renders `ProfileSettingsPage`, and that
 * renders `EmailRow` (`core/components/settings/pages/profile/profile-settings-page.tsx:13`, `:92`).
 */
const PROFILE_PATH = '/settings/personal';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The three calls the profile screen causes, all of them to the mock origin (measured; see the MEASURE lines). */
const USER_PATH = '/api/user/me';
const STATUS_PATH = '/api/auth/email/verify/status';
const SEND_PATH = '/api/auth/email/verify/resend-link';

/** The English the page renders, copied from `locales/en.json` at the lines named in the header. */
const TEXT = {
	title: 'Confirm your email address',
	profileCodeSent: 'Enter the code we sent to {email} to confirm the address is yours.',
	codeNotSent: 'Send a code to {email} to confirm the address is yours.',
	newCodeOnTheWay: 'A new code is on its way to {email}.',
	sendANewCode: 'Send a new code',
	noticeCodeSent: 'We sent a code to {email}.',
	chipVerified: 'Verified',
	chipNotVerified: 'Not verified'
};

const withEmail = (text: string, email: string) => text.replace('{email}', email);

/** The mock's CORS answer (`mock-gauzy-server.mjs:997-1006`), for an answer this spec writes itself. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** What the app reads as its status answer for each case (`emailVerificationStatusSchema` allows `isEmailVerified`
 *  alone, and `verificationEmailSent` is optional). */
const STATUS_UNVERIFIED_CODE_SENT = { status: 200, body: { isEmailVerified: false, verificationEmailSent: true } };
const STATUS_UNVERIFIED_NO_CODE = { status: 200, body: { isEmailVerified: false, verificationEmailSent: false } };
const STATUS_VERIFIED_ELSEWHERE = { status: 200, body: { isEmailVerified: true } };
/** Gauzy with FEATURE_EMAIL_VERIFICATION off answers this path 404 (`email-verification.service.ts:24-27`, `:40-42`). */
const STATUS_NOT_FOUND = { status: 404, body: { statusCode: 404, message: 'Cannot GET /auth/email/verify/status' } };
const STATUS_OUTAGE = { status: 500, body: { statusCode: 500, message: 'The verification status could not be read' } };
/** `authService.resendVerifyUserLink` returns an `ISuccessResponse` and nothing validates it
 *  (`use-account-email.ts:32-44`), so a plain success answer is enough for the panel's own success path. */
const SEND_OK = { status: 200, body: { success: true, message: 'A verification link was sent.' } };

type StubAnswer = { status: number; body: Record<string, unknown> };

/** Everything this spec watched on the wire for one page. */
type Traffic = {
	/** `GET` asks of the status path, oldest first, with the full URL the browser sent. */
	statusAsks: string[];
	/** Their answers: a status number, or 0 for a request that never got one. */
	statusAnswers: number[];
	/** Browser preflights of the status path (a CORS artifact, not an ask of the app). */
	statusPreflights: number;
	/** `GET` asks of the user path. */
	userAsks: string[];
	/** `POST` asks of the send-code path. */
	sendAsks: string[];
};

const urlOf = (raw: string) => {
	try {
		return new URL(raw);
	} catch {
		return undefined;
	}
};

/** Whether this URL is one of the three calls this spec cares about, on the mock origin. */
const isWatchedCall = (raw: string) => {
	const url = urlOf(raw);
	if (!url || url.origin !== MOCK_API_ORIGIN) return false;

	return url.pathname === USER_PATH || url.pathname === STATUS_PATH || url.pathname === SEND_PATH;
};

/** Watches the three calls for one page, from the moment it is attached (before the first navigation). */
function watchTraffic(page: Page): Traffic {
	const traffic: Traffic = {
		statusAsks: [],
		statusAnswers: [],
		statusPreflights: 0,
		userAsks: [],
		sendAsks: []
	};

	page.on('request', (request) => {
		if (!isWatchedCall(request.url())) return;
		const pathname = urlOf(request.url())?.pathname ?? '';
		const method = request.method();
		if (pathname === STATUS_PATH) {
			if (method === 'OPTIONS') traffic.statusPreflights += 1;
			else traffic.statusAsks.push(`${method} ${request.url()}`);
		}
		if (pathname === USER_PATH && method === 'GET') traffic.userAsks.push(request.url());
		if (pathname === SEND_PATH && method === 'POST') traffic.sendAsks.push(request.url());
	});
	page.on('response', (response) => {
		if (!isWatchedCall(response.url())) return;
		if (urlOf(response.url())?.pathname === STATUS_PATH && response.request().method() === 'GET') {
			traffic.statusAnswers.push(response.status());
		}
	});
	page.on('requestfailed', (request) => {
		if (!isWatchedCall(request.url())) return;
		if (urlOf(request.url())?.pathname === STATUS_PATH && request.method() === 'GET') traffic.statusAnswers.push(0);
	});

	return traffic;
}

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function report(label: string, traffic: Traffic, email?: string) {
	console.log(
		`[lane-a evp] MEASURE ${label} · status asks ${traffic.statusAsks.length} ` +
			`${JSON.stringify(traffic.statusAsks.map((ask) => ask.split(' ')[1]))} · answers ` +
			`${JSON.stringify(traffic.statusAnswers)} · preflights ${traffic.statusPreflights} · user asks ` +
			`${JSON.stringify(traffic.userAsks)} · send asks ${JSON.stringify(traffic.sendAsks)} · email ` +
			`${JSON.stringify(email ?? null)}`
	);
}

/**
 * Stubs the signed-in user as the mock's real answer with `isEmailVerified` set to false, and records the real answer
 * it edited. The mock is still asked (`route.fetch()`), so its own request log shows the read this stub was built on.
 */
async function stubUnverifiedUser(page: Page, seen: { user: Record<string, unknown> | null }): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === USER_PATH,
		async (route) => {
			if (route.request().method() !== 'GET') return route.fallback();
			const real = await route.fetch();
			const original = (await real.json()) as Record<string, unknown>;
			seen.user = original;

			return route.fulfill({
				status: real.status(),
				headers: CORS_HEADERS,
				json: { ...original, isEmailVerified: false }
			});
		}
	);
}

/** Answers the status path with one fixed answer; `null` leaves it to the mock (which knows no such path). */
async function stubStatus(page: Page, answer: StubAnswer | null): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === STATUS_PATH,
		(route) => {
			if (!answer || route.request().method() !== 'GET') return route.fallback();

			return route.fulfill({ status: answer.status, headers: CORS_HEADERS, json: answer.body });
		}
	);
}

/** Answers the send-code POST with a success, and records the request the browser sent. */
async function stubSendCode(
	page: Page,
	seen: Array<{ method: string; url: string; body: Record<string, unknown> }>
): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === SEND_PATH,
		(route) => {
			if (route.request().method() !== 'POST') return route.fallback();
			seen.push({
				method: route.request().method(),
				url: route.request().url(),
				body: (route.request().postDataJSON() ?? {}) as Record<string, unknown>
			});

			return route.fulfill({ status: SEND_OK.status, headers: CORS_HEADERS, json: SEND_OK.body });
		}
	);
}

const panelTitle = (page: Page) => page.getByText(TEXT.title, { exact: true });
const chip = (page: Page, label: string) => page.getByText(label, { exact: true });
const sendButton = (page: Page) => page.getByRole('button', { name: TEXT.sendANewCode });

/** Signs the fixture person in and opens Settings › Profile, with the stubs already armed. */
async function openProfile(
	page: Page,
	fixture: { ids: Record<string, string>; names: Record<string, string>; profileLink: string },
	options: { unverifiedUser?: boolean; status?: StubAnswer | null }
) {
	const seen = { user: null as Record<string, unknown> | null };
	if (options.unverifiedUser) await stubUnverifiedUser(page, seen);
	if ('status' in options) await stubStatus(page, options.status ?? null);
	await signInAndVisit(page, fixture, PROFILE_PATH);
	const email = typeof seen.user?.email === 'string' ? seen.user.email : undefined;

	return { seen, email };
}

/** The witness that the stub worked: the page shows the lane person with the address the mock really answered. */
const stubProof = (email: string | undefined, traffic: Traffic) =>
	`email ${JSON.stringify(email ?? null)} · user asks ${JSON.stringify(traffic.userAsks)} · status asks ` +
	`${JSON.stringify(traffic.statusAsks)}`;

test.describe('lane-a · Settings › Profile, the e-mail verification panel and the status behind it', () => {
	// ---------------------------------------------------------------- 1. the control

	test('1 · control, nothing stubbed: the lane person is verified, so no panel appears and the status is never asked', async ({
		page,
		fixture
	}) => {
		const traffic = watchTraffic(page);
		await signInAndVisit(page, fixture, PROFILE_PATH);

		await expect(chip(page, TEXT.chipVerified), `the lane person is no longer signed in verified`).toBeVisible({
			timeout: 20_000
		});
		await expect(chip(page, TEXT.chipNotVerified)).toHaveCount(0);
		await expect(panelTitle(page)).toHaveCount(0);

		// `useEmailVerificationStatus` enables its query only for an unverified user (`:31`, `:35`), so the status path
		// is not asked at all — not once for the panel, not once for the home page this visit also loads.
		expect(
			traffic.statusAsks.length,
			`a verified person caused a status ask (${JSON.stringify(traffic.statusAsks)})`
		).toBe(0);
		report('1 control (verified user, no stub)', traffic);
	});

	// ---------------------------------------------------------------- 2 and 3. what the panel says

	test('2 · unverified + a code was sent: the panel asks for that code and names the address it went to', async ({
		page,
		fixture
	}) => {
		const traffic = watchTraffic(page);
		const { email } = await openProfile(page, fixture, {
			unverifiedUser: true,
			status: STATUS_UNVERIFIED_CODE_SENT
		});
		expect(email, `the user stub never saw the mock's own answer: ${stubProof(email, traffic)}`).toBeTruthy();

		await expect(
			chip(page, TEXT.chipNotVerified),
			`the page does not show the unverified person: ${stubProof(email, traffic)}`
		).toBeVisible({ timeout: 20_000 });
		await expect(panelTitle(page), `the panel is absent although the status asks for a code`).toBeVisible({
			timeout: 20_000
		});
		// The panel's "a code was sent" sentence is `settings.profile.VERIFY_TEXT` (en.json:5673), as
		// email-verification-panel.tsx asks for; `notifications.NOTICES.VERIFY_TEXT` ("We sent a code to …", en.json:4284) is
		// the home page notice's own wording (case 8). Two keys, two places, both as written in the components.
		const expected = withEmail(TEXT.profileCodeSent, email ?? '');
		await expect(
			page.getByText(expected),
			`the panel does not say ${JSON.stringify(expected)} · the panel block reads ${JSON.stringify(
				await panelTitle(page)
					.locator('..')
					.innerText()
					.catch(() => '<unreadable>')
			)}`
		).toBeVisible({ timeout: 20_000 });
		await expect(page.getByText(withEmail(TEXT.codeNotSent, email ?? ''))).toHaveCount(0);

		expect(traffic.statusAsks.length, `the unverified person never asked the status`).toBeGreaterThanOrEqual(1);
		expect(traffic.statusAnswers, `the status ask was not answered with this case's 200`).toContain(200);
		report(`2 unverified + verificationEmailSent=true (panel text ${JSON.stringify(expected)})`, traffic, email);
	});

	test('3 · unverified + no code went out: the panel offers to send one to that address', async ({
		page,
		fixture
	}) => {
		const traffic = watchTraffic(page);
		const { email } = await openProfile(page, fixture, { unverifiedUser: true, status: STATUS_UNVERIFIED_NO_CODE });
		expect(email, `the user stub never saw the mock's own answer: ${stubProof(email, traffic)}`).toBeTruthy();

		await expect(panelTitle(page), `the panel is absent although the status says unverified`).toBeVisible({
			timeout: 20_000
		});
		const expected = withEmail(TEXT.codeNotSent, email ?? '');
		await expect(
			page.getByText(expected),
			`the panel does not say ${JSON.stringify(expected)} · the panel block reads ${JSON.stringify(
				await panelTitle(page)
					.locator('..')
					.innerText()
					.catch(() => '<unreadable>')
			)}`
		).toBeVisible({ timeout: 20_000 });
		await expect(page.getByText(withEmail(TEXT.profileCodeSent, email ?? ''))).toHaveCount(0);
		await expect(sendButton(page), `the panel offers no way to send a code`).toBeVisible();

		expect(traffic.statusAsks.length, `the unverified person never asked the status`).toBeGreaterThanOrEqual(1);
		expect(traffic.statusAnswers, `the status ask was not answered with this case's 200`).toContain(200);
		report(`3 unverified + verificationEmailSent=false (panel text ${JSON.stringify(expected)})`, traffic, email);
	});

	// ---------------------------------------------------------------- 4 and 5. when no panel is owed

	test('4 · unverified + the deployment verifies no address (404): no panel, because no code could ever be sent', async ({
		page,
		fixture
	}) => {
		const traffic = watchTraffic(page);
		const { email } = await openProfile(page, fixture, { unverifiedUser: true, status: STATUS_NOT_FOUND });
		expect(email, `the user stub never saw the mock's own answer: ${stubProof(email, traffic)}`).toBeTruthy();

		// The 404 has to be seen by the app before "no panel" means anything: prove the ask and its answer first.
		await expect
			.poll(() => traffic.statusAnswers, {
				message: `the status was never asked and answered 404 (${JSON.stringify(traffic.statusAsks)})`,
				timeout: 20_000
			})
			.toContain(404);
		await page.waitForTimeout(2_000);
		await expect(
			panelTitle(page),
			`the panel appeared although 404 means "this deployment verifies no address"`
		).toHaveCount(0);
		await expect(sendButton(page)).toHaveCount(0);

		// The address is still unverified on the row — the 404 changed what the app asks for, not what the user is.
		await expect(
			chip(page, TEXT.chipNotVerified),
			`the row no longer says the address is unverified`
		).toBeVisible();
		expect(
			traffic.statusAsks.length,
			`the 404 case asked the status ${traffic.statusAsks.length} times`
		).toBeGreaterThanOrEqual(1);
		report('4 unverified + 404 (no panel)', traffic, email);
	});

	test('5 · unverified + the address was verified meanwhile: no panel, because the status is read after the user', async ({
		page,
		fixture
	}) => {
		const traffic = watchTraffic(page);
		const { email } = await openProfile(page, fixture, { unverifiedUser: true, status: STATUS_VERIFIED_ELSEWHERE });
		expect(email, `the user stub never saw the mock's own answer: ${stubProof(email, traffic)}`).toBeTruthy();

		await expect
			.poll(() => traffic.statusAnswers, {
				message: `the status was never asked and answered 200 (${JSON.stringify(traffic.statusAsks)})`,
				timeout: 20_000
			})
			.toContain(200);
		await page.waitForTimeout(2_000);
		await expect(
			panelTitle(page),
			`the panel appeared although the status says the address is verified`
		).toHaveCount(0);
		await expect(
			chip(page, TEXT.chipNotVerified),
			`the row no longer says the address is unverified`
		).toBeVisible();
		expect(
			traffic.statusAsks.length,
			`this case asked the status ${traffic.statusAsks.length} times`
		).toBeGreaterThanOrEqual(1);
		report('5 unverified + status says verified (no panel)', traffic, email);
	});

	// ---------------------------------------------------------------- 6. the status cannot be read

	test('6 · unverified + the status cannot be read (500): the panel still appears, without claiming a code went out', async ({
		page,
		fixture
	}) => {
		const traffic = watchTraffic(page);
		const { email } = await openProfile(page, fixture, { unverifiedUser: true, status: STATUS_OUTAGE });
		expect(email, `the user stub never saw the mock's own answer: ${stubProof(email, traffic)}`).toBeTruthy();

		// `UNREADABLE_STATUS` (`use-email-verification-status.ts:23`, `:38-41`) is only returned once the query has
		// errored and holds no data, and a failed query is retried, so the panel arrives after the retries: measured
		// asks and answers in the MEASURE line below.
		await expect(
			panelTitle(page),
			`the outage left no panel (${JSON.stringify(traffic.statusAnswers)})`
		).toBeVisible({
			timeout: 45_000
		});
		const expected = withEmail(TEXT.codeNotSent, email ?? '');
		await expect(
			page.getByText(expected),
			`the outage panel claims a code was sent · the panel block reads ${JSON.stringify(
				await panelTitle(page)
					.locator('..')
					.innerText()
					.catch(() => '<unreadable>')
			)}`
		).toBeVisible({ timeout: 20_000 });

		expect(
			traffic.statusAnswers.length,
			`the outage asked the status only ${traffic.statusAnswers.length} times`
		).toBeGreaterThanOrEqual(1);
		expect(
			traffic.statusAnswers.every((status) => status === 500),
			`a status ask was answered something else: ${JSON.stringify(traffic.statusAnswers)}`
		).toBe(true);
		report(
			`6 unverified + 500 (panel text ${JSON.stringify(expected)}, answers ${JSON.stringify(traffic.statusAnswers)})`,
			traffic,
			email
		);
	});

	// ---------------------------------------------------------------- 7. sending a code from the panel

	test('7 · the panel sends its own code: one POST, the answer switches to the code-was-sent wording, and the status is read again', async ({
		page,
		fixture,
		mock
	}) => {
		const traffic = watchTraffic(page);
		const sent: Array<{ method: string; url: string; body: Record<string, unknown> }> = [];
		const seen = { user: null as Record<string, unknown> | null };
		await stubUnverifiedUser(page, seen);
		await stubStatus(page, STATUS_UNVERIFIED_NO_CODE);
		await stubSendCode(page, sent);
		await signInAndVisit(page, fixture, PROFILE_PATH);
		const email = typeof seen.user?.email === 'string' ? seen.user.email : undefined;
		expect(email, `the user stub never saw the mock's own answer: ${stubProof(email, traffic)}`).toBeTruthy();

		const notSentYet = withEmail(TEXT.codeNotSent, email ?? '');
		await expect(page.getByText(notSentYet), `the panel did not start in the "send a code" wording`).toBeVisible({
			timeout: 20_000
		});

		const asksBefore = traffic.statusAsks.length;
		await sendButton(page).click();

		await expect
			.poll(() => sent.length, {
				message: `clicking the panel's ${JSON.stringify(TEXT.sendANewCode)} sent no POST to ${SEND_PATH} (${JSON.stringify(traffic.sendAsks)})`,
				timeout: 20_000
			})
			.toBe(1);
		const write = sent[0];
		expect(new URL(write.url ?? '').origin, `the send ask left for ${write?.url}`).toBe(MOCK_API_ORIGIN);
		expect(new URL(write.url ?? '').pathname, `the send ask is not ${SEND_PATH}: ${write?.url}`).toBe(SEND_PATH);

		const sentText = withEmail(TEXT.profileCodeSent, email ?? '');
		await expect(
			page.getByText(sentText),
			`the panel did not switch to ${JSON.stringify(sentText)} · the panel block reads ${JSON.stringify(
				await panelTitle(page)
					.locator('..')
					.innerText()
					.catch(() => '<unreadable>')
			)}`
		).toBeVisible({ timeout: 20_000 });
		await expect(page.getByText(notSentYet)).toHaveCount(0);
		await expect(
			page.getByText(withEmail(TEXT.newCodeOnTheWay, email ?? '')),
			`no ${JSON.stringify(TEXT.newCodeOnTheWay)} status message appeared after the send`
		).toBeVisible({ timeout: 20_000 });

		// `useAccountEmail.onSuccess` invalidates the status query (`:35-42`), so the send caused another status ask on
		// top of the one the page started with. The panel keeps its own wording from `hasSentCode`
		// (`email-verification-panel.tsx:49`) even though the stubbed status still answers "no code went out".
		await expect
			.poll(() => traffic.statusAsks.length, {
				message: `the send re-asked no status (asks before ${asksBefore}, now ${traffic.statusAsks.length})`,
				timeout: 20_000
			})
			.toBeGreaterThan(asksBefore);
		const statusPosts = await mock.calls(SEND_PATH);
		expect(statusPosts.length, `the mock recorded a ${SEND_PATH} of its own (${JSON.stringify(statusPosts)})`).toBe(
			0
		);
		report(
			`7 panel send (POST ${SEND_PATH}, text ${JSON.stringify(sentText)}, status asks ${asksBefore} → ` +
				`${traffic.statusAsks.length})`,
			traffic,
			email
		);
	});

	// ---------------------------------------------------------------- 8. the other consumer, on the home page

	test('8 · the home page notice is the other consumer: it says a code was sent in its own wording', async ({
		page,
		fixture
	}) => {
		const traffic = watchTraffic(page);
		const { email } = await openProfile(page, fixture, {
			unverifiedUser: true,
			status: STATUS_UNVERIFIED_CODE_SENT
		});
		expect(email, `the user stub never saw the mock's own answer: ${stubProof(email, traffic)}`).toBeTruthy();

		await page.goto(`${APP_ORIGIN}/`, { waitUntil: 'domcontentloaded' });
		const noticeLine = withEmail(TEXT.noticeCodeSent, email ?? '');
		await expect(
			page.getByText(noticeLine),
			`the home page notice does not say ${JSON.stringify(noticeLine)} · the page says ${JSON.stringify(
				await page
					.locator('body')
					.innerText()
					.then((value) => value.replace(/\s+/g, ' ').trim().slice(0, 300))
					.catch(() => '<unreadable>')
			)}`
		).toBeVisible({ timeout: 30_000 });
		await expect(chip(page, TEXT.title)).toBeVisible();

		expect(
			traffic.statusAsks.length,
			`the home page asked the status ${traffic.statusAsks.length} times`
		).toBeGreaterThanOrEqual(1);
		report(`8 home page notice (text ${JSON.stringify(noticeLine)})`, traffic, email);
	});
});

// Nothing here arms a mock scenario, but the user stub reaches the mock through `route.fetch()` and its answers land in
// the lane's request log: reset after each test so the next spec in this lane starts from a clean log.
test.afterEach(async () => {
	await mockReset();
});
