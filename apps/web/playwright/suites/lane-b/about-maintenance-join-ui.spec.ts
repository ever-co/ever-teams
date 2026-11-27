import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { BrowserContext, Locator, Page } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import {
	APP_ORIGIN,
	hardVisit,
	overrideRuntimeEnv,
	type BootstrapFixture,
	signInWithFixture,
	stubNextAuthSession
} from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { MOCK_EMAIL, sessionCookies } from './lane-auth-helpers';

/**
 * lane-b §smallpages — the three pages that had no UI spec — `about`, `maintenance` and `team/join` — in the browser.
 *
 *   - `/about` — `app/[locale]/(main)/about/page.tsx` `withAuthentication(AboutPage, { displayName: 'About', … })`
 *     → `core/components/pages/about/about-page.tsx`. Its link list, branding filter, build kind and copy summary are
 *     the pure rules of `core/lib/about-info.ts`, unit-tested in `core/lib/about-info.test.ts`; this file drives them
 *     through the real page.
 *   - `/maintenance` — `app/[locale]/(focus)/maintenance/page.tsx` → `core/components/pages/maintenance/index.tsx`.
 *   - `/team/join` — `app/[locale]/(focus)/team/join/page.tsx` → `core/components/pages/teams/join/join-team-page.tsx`,
 *     whose sequence is `core/hooks/auth/use-authentication-passcode.ts` (submit `handleSubmit` →
 *     `verifyPasscodeRequest`; the `?email=&code=` auto-fire → `verifySignInEmailConfirmRequest`; resend
 *     `sendAuthCodeHandler`) on this lane's direct mode (the served runtime payload names the lane mock as
 *     `NEXT_PUBLIC_GAUZY_API_SERVER_URL`, so every auth write lands as `POST <mock origin>/api/...` —
 *     `core/services/client/api/auth/auth.service.ts`).
 *
 * Real: the lane's app (next dev) and its mock (the shell reads, `GET /api/user/me` included). Served by this file
 * through `page.route` on the mock origin (the mock's CORS answer restated, `OPTIONS` → 204): `GET /api/version` (a
 * version, a 500, a held answer), `POST /api/auth/login`, `POST /api/auth/signin.email/confirm`,
 * `POST /api/auth/signin.email`. Emails and codes are made up (`probe.joiner@example.test`, `AB12CD34`, `AUTO1234`);
 * no real invitation is used. Clipboard access is granted to this file's copy test only (`test.use` in that
 * describe), and what is read back is this file's own served values plus the page's own labels.
 *
 * **Safety.** Every `/about` link leaves the app (github.com, the licence, the commits, the operator branding hosts):
 * not one is clicked; each link is asserted by `href`/`target`/`rel` exactly as printed. Test-side branding
 * (`overrideRuntimeEnv`, `playwright/helpers.ts` — the branding constants read `readRuntimeEnv`,
 * `core/constants/config/constants.tsx`) always points at the lane's mock origin, and the malformed or
 * credential-carrying addresses this file serves are never fetched by anything. Hosts are guarded on every test
 * (`guardHosts`/`expectAllowedHosts`, copied from `suites/lane-b/board-page-ui.spec.ts`): only the lane's app and
 * mock may be asked, and nothing may need aborting.
 *
 * ## Where the numbers came from
 *
 * Throwaway probes `D:/Coding/.tmp/probe-smallpages/probe.spec.ts` (`probe-run-2.log`), `probe2.spec.ts`
 * (`probe-run-4.log`), `probe3.spec.ts` (`probe-run-5a.log`, `probe-run-5b.log`), run on this lane on 2026-11-27
 * with the lane's own servers, plus the `MEASURE` lines this file prints. Every pinned value is such a MEASURE line.
 *
 * ## What the code says, line by line (each line read before it is named)
 *
 * - `about-page.tsx:58` licence `${EVER_TEAMS_REPOSITORY_URL}/blob/HEAD/LICENSE`; `:82-88` `getApiState` (a failure
 *   wins over an older success); `:91-98` `formatBuild` → `v<ver> (<commit>)`; `:162-180` `CommitChip` — commit
 *   `'dev'` renders a plain `<span>`, any other commit an `<a>` to `getCommitUrl` with `target=_blank
 *   rel="noopener noreferrer"` and title `layout.footer.OPEN_COMMIT`; `:213-222` each row's end-link (title
 *   `pages.about.REPOSITORY`); `:274-285` + `:442-455` the "Learn more" aside only when `getBrandingLinks` returns
 *   rows; `:292-302` the copyable summary through `formatAboutDetails`; `:350-361` the Retry button (aria-label
 *   `whatsNew.RETRY`) only while `apiState='unreachable'`; `:408` the Deployment row only when a deployment is
 *   configured.
 * - The web row on this lane: version `v0.1.0` comes from `next.config.js:148` (`NEXT_PUBLIC_BUILD_VERSION ||
 *   webPackageVersion`, `apps/web/package.json:3` `"version": "0.1.0"`), commit `dev` from `next.config.js:8` (no
 *   git SHA env on the lane) — `probe-run-2.log` P1.
 * - `core/lib/build-info.ts` `getWebBuildInfo` fallbacks, `getShortCommit` (7 chars), `getCommitUrl`.
 * - `core/hooks/queries/use-app-version-query.ts` — `staleTime: Infinity`, `retry: false`, `refetchOnMount: false`:
 *   one served answer per mount state. Dev Strict Mode made the initial read one time (`probe-run-5a.log` R4 calls
 *   `[500,500,200]` with the retry click) and twice another (`probe-run-2.log`) — no exact read count is pinned
 *   anywhere in this file, only "more than before".
 * - `join-team-page.tsx` submits through the hook's `handleSubmit` → `POST /api/auth/login` `{email, code}`
 *   (`auth.service.ts:136-142`); the confirm endpoint is **not** touched by the button (`probe-run-4.log` Q10
 *   `confirm calls 0`). The `?email=&code=` auto-fire does the opposite: confirm first with
 *   `{email, code, includeTeams: true}` (`auth.service.ts:201-217`, `probe-run-5b.log` R5).
 * - `join-team-page.tsx` prefills the email from the session user (`useAuthenticateUser` → mock `GET /api/user/me`);
 *   `SignedInAccount` (`core/components/layouts/focus/signed-in-account.tsx`) renders nothing while signed out — no
 *   token, so no `user/me` read at all (`probe-run-2.log` P8: the join page asked the mock for nothing).
 * - `core/hooks/auth/use-resend-cooldown.ts` `RESEND_CODE_COOLDOWN_SECONDS = 60`, `formatCountdown` mm:ss, a 1 s
 *   `setTimeout` chain — driven here with `page.clock.install()` + 1 s `fastForward` steps (a single big
 *   `fastForward` only ticks the chain once: `probe-run-4.log`).
 * - `core/lib/auth/navigate-after-sign-in.ts` — a sign-in that succeeded is a full page load `location.replace('/')`.
 *
 * ## Findings
 *
 * - **A refused `?email=&code=` sign-in never shows the server's 400 errors. [MEASURED, NOT INTENDED]**
 *   `core/hooks/auth/use-authentication-passcode.test.tsx:106` names the intent outright —
 *   `it('surfaces the confirm 400 errors when both attempts fail', …)`, asserting `result.current.errors` =
 *   `{ code: 'expired' }` for this very path (`verifySignInEmailConfirmRequest`) — yet measured on the page the served
 *   400 messages (`probe confirm refusal line` / `probe login refusal line`) never appear; the generic
 *   `pages.auth.INVALID_CODE_TRY_AGAIN` shows instead (`probe-run-5b.log` R5 main text). Cause read off the code: the
 *   service rejects with `ApiErrorService` (`core/services/client/api.service.ts` `_handleAxiosError` →
 *   `throw ApiErrorService.fromAxiosError(error)`; `core/services/client/api-error.service.ts:136`
 *   `export class ApiErrorService extends Error`, carrying no `.response` and no `isAxiosError`), so
 *   `isAxiosError(confirmError)` (`use-authentication-passcode.ts:244-247`) is never true in the browser — the unit
 *   test passes only because its mocks reject in AxiosError shape.
 * - **A refused join button shows the person nothing at all** (untagged: no comment, type or test states what this
 *   path should show). The same missing `.response` makes the button path's `err.response?.status === 400` branch
 *   (`use-authentication-passcode.ts:327-329`, `verifyPasscodeRequest`) dead in the browser: a 400 with a message and
 *   a 500 both leave only the cleared code field (`probe-run-4.log` Q11: slots `""`, email kept), and no error line.
 * - **A refused "Send it again" shows nothing either, although the page says the hook does. [MEASURED, NOT
 *   INTENDED]** `join-team-page.tsx:55` comments
 *   `// Only a code that went out starts the wait; the hook already shows the error of a failed send`
 *   — measured: a served 400 `{errors:{email:'probe send refusal line'}}` on `POST /auth/signin.email` leaves the
 *   page text unchanged and the button still reads `Send it again`; the only trace is the `[HttpClient] HTTP Error`
 *   console line (`probe-run-5b.log` R7 `send refusal shown false`). The same missing `.response` is why
 *   `sendAuthCodeHandler`'s 400 branch never fires in the browser.
 * - **The anonymous `/maintenance` page is a brief visitor, not a stay, and the signed-in one is bounced home.**
 *   Signed out it renders the notice (title, text, `Try again` link `href="/"`), and within ~2 s the app itself
 *   navigates the anonymous visitor to the sign-in page (`probe-run-5b.log` R1 snapshots: `t0s /maintenance … Try
 *   again` → `t2s /auth/passcode "Sign in to Ever Teams"`; one document, `GET /maintenance 200`). A signed-in
 *   visitor renders the same notice, then lands on the app home shell (`probe-run-5a.log` R2). No comment, type or
 *   test states an intent for either bounce, so both are written as measured; the `Try again` click is not pinned —
 *   the link detaches mid-click as the bounce starts (`probe-run-4.log` Q6 `element was detached`), and what a click
 *   on `/` would do is pinned elsewhere (`suites/api/page-gate.spec.ts`).
 * - **`/about` on this lane does show "Learn more".** The lane serves operator branding (`APP_LINK
 *   https://ever.team`, `COMPANY_LINK https://ever.co`, `COMPANY_NAME 'Ever Co. LTD'`, TERMS, PRIVACY in the served
 *   `data-ever-teams-runtime-env` payload), so `BRANDING_LINKS_SET_BY_OPERATOR` (`constants.tsx:445-449`) is true and
 *   four links render (`probe-run-5a.log` R3). The no-branding state is only reachable through `overrideRuntimeEnv`
 *   — and there the page behaves exactly as `about-info.test.ts` states, so those states carry no tag.
 * - The join page renders no workspace chooser: a confirm answered with `{workspaces:[…]}` would set
 *   `setScreen('workspace')` (`use-authentication-passcode.ts`), which `join-team-page.tsx` never draws. Not covered
 *   here (no such answer is served).
 * - Not covered on purpose: the sign-in gates (`suites/api/page-gate.spec.ts`, `suites/lane-d/page-gate-lane.spec.ts`
 *   pin `/maintenance`, `/team/join` and `/about` gate reasons), the generic passcode journey
 *   (`suites/lane-b/passcode-journey.spec.ts`), the Ever ID step, two-factor, and the workspace chooser.
 */

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	auth: { signIn: { TITLE: string } };
	pages: {
		about: Record<string, string>;
		joinTeam: Record<string, string>;
		auth: { INVALID_CODE_TRY_AGAIN: string; signIn: { TITLE: string } };
		systemPages: { MAINTENANCE_TITLE: string; MAINTENANCE_TEXT: string };
		unauthorized: { TRY_AGAIN: string };
	};
	layout: { footer: Record<string, string> };
	form: { EMAIL_PLACEHOLDER: string };
	whatsNew: { RETRY: string };
};

const T = EN.pages.about;
const J = EN.pages.joinTeam;

/** The licence link's own words: the `<license>` part of `pages.about.LICENSE` (a rich-text chunk, `about-page.tsx:58`). */
const LICENSE_NAME = /<license>(.*?)<\/license>/.exec(T.LICENSE)?.[1] ?? T.LICENSE;

/**
 * The web row's version: `next.config.js:148` `NEXT_PUBLIC_BUILD_VERSION || webPackageVersion` — the lane sets no
 * build version, so it is `apps/web/package.json`'s own (`probe-run-2.log` P1), read here, never typed.
 */
const WEB_VERSION = `v${(JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf8')) as { version: string }).version}`;

/** `getShortCommit` (`core/lib/build-info.ts`): the first seven characters. */
const shortCommit = (commit: string) => commit.slice(0, 7);

const filled = (template: string, values: Record<string, string>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

const report = (label: string, value: unknown) =>
	console.log(`[lane-b smallpages] MEASURE ${label} ${JSON.stringify(value)}`);

/** The two hosts these pages may call. Nothing else is allowed, and nothing else was seen. */
const ALLOWED_ORIGINS = new Set([APP_ORIGIN, new URL(MOCK_ORIGIN).origin]);

type Traffic = {
	calls: () => Array<{ method: string; origin: string; path: string; status: number }>;
	origins: () => string[];
	aborted: () => string[];
};

/** Copied from `suites/lane-b/board-page-ui.spec.ts` (recording statuses, for the read assertions below). */
async function guardHosts(context: BrowserContext): Promise<Traffic> {
	const calls: Array<{ method: string; origin: string; path: string; status: number }> = [];
	const aborted: string[] = [];

	context.on('request', (request) => {
		const url = new URL(request.url());
		calls.push({ method: request.method(), origin: url.origin, path: url.pathname, status: 0 });
	});
	context.on('response', (response) => {
		const url = new URL(response.url());
		const entry = [...calls]
			.reverse()
			.find((call) => call.origin === url.origin && call.path === url.pathname && call.status === 0);
		if (entry) entry.status = response.status();
	});
	context.on('page', (popup) =>
		popup.on('request', (request) => {
			const url = new URL(request.url());
			calls.push({ method: request.method(), origin: url.origin, path: url.pathname, status: 0 });
		})
	);

	await context.route('**/*', (route, request) => {
		const url = new URL(request.url());
		if (ALLOWED_ORIGINS.has(url.origin)) return route.fallback();
		aborted.push(`${request.method()} ${url.origin}${url.pathname}`);
		return route.abort('blockedbyclient');
	});

	return {
		calls: () => [...calls],
		origins: () => [...new Set(calls.map((call) => call.origin))].sort(),
		aborted: () => [...aborted]
	};
}

/** The safety rule for one test, as in the board spec. */
function expectAllowedHosts(traffic: Traffic, why: string) {
	const seen = traffic.origins();
	const outside = seen.filter((origin) => !ALLOWED_ORIGINS.has(origin));
	expect(
		seen,
		`${why}: the browser called ${JSON.stringify(seen)} — only ${[...ALLOWED_ORIGINS].sort().join(' and ')} may be called`
	).toEqual([...ALLOWED_ORIGINS].sort().filter((origin) => seen.includes(origin)));
	expect(
		outside,
		`${why}: the page reached ${JSON.stringify(outside)}; these pages may never name a host outside the lane`
	).toEqual([]);
	expect(
		traffic.aborted(),
		`${why}: this file's guard had to abort ${JSON.stringify(traffic.aborted())} — nothing outside the two allowed hosts should have been asked for`
	).toEqual([]);
}

/** Shell noise that is not a defect (named the same way in the chat-conversation spec). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';

const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));

/** `[HttpClient] HTTP Error` lines for statuses this file armed — excused only in the tests that arm them. */
const armedHttpErrors = (shield: Shield) =>
	consoleFindings(shield).filter((line) => !line.includes('[HttpClient] HTTP Error'));

/** The mock's CORS answer restated for every answer this file writes (`mock-gauzy-server.mjs`). */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

type ServedRoute = Parameters<Parameters<Page['route']>[1]>[0];

const answer = (route: ServedRoute, status: number, body?: unknown) =>
	route.fulfill({
		status,
		headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
		body: body === undefined ? '' : JSON.stringify(body)
	});

const VERSION_BODY = {
	name: 'Ever Gauzy',
	version: '12.3.4',
	commit: '0123456789abcdef0123456789abcdef01234567'
};

/** `GET /api/version` on the mock origin; `mode()` decides each answer at answer time, so read counts stay free. */
async function serveVersion(
	page: Page,
	options: { mode?: () => { status: number; body?: unknown }; hold?: boolean } = {}
) {
	const state = { n: 0, released: false };
	await page.route(
		(url) => url.origin === MOCK_ORIGIN && url.pathname === '/api/version',
		async (route) => {
			if (route.request().method() === 'OPTIONS') return answer(route, 204);
			state.n += 1;
			if (options.hold) {
				// Hold every answer until the test releases it: this is the pending-state driver.
				await new Promise<void>((resolve) => {
					const timer = setInterval(() => {
						if (state.released) {
							clearInterval(timer);
							resolve();
						}
					}, 50);
				});
			}
			const outcome = options.mode ? options.mode() : { status: 200, body: VERSION_BODY };
			return answer(route, outcome.status, outcome.body);
		}
	);
	return { calls: () => state.n, release: () => (state.released = true) };
}

/** One `POST` path on the mock origin with a fixed answer, recording every body it was sent. */
async function servePost(
	page: Page,
	pathname: string,
	outcome: { status: number; body?: unknown }
): Promise<{ count: () => number; bodies: () => Array<Record<string, unknown>> }> {
	const seen: Array<Record<string, unknown>> = [];
	await page.route(
		(url) => url.origin === MOCK_ORIGIN && url.pathname === pathname,
		async (route) => {
			if (route.request().method() === 'OPTIONS') return answer(route, 204);
			seen.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
			return answer(route, outcome.status, outcome.body);
		}
	);
	return { count: () => seen.length, bodies: () => [...seen] };
}

const JOIN_EMAIL = 'probe.joiner@example.test';
const JOIN_CODE = 'AB12CD34';
const AUTO_CODE = 'AUTO1234';

/** The runtime payload the page itself installed (`data-ever-teams-runtime-env`), read, never typed. */
const servedRuntimeEnv = (page: Page) =>
	page.evaluate((attribute: string) => {
		const raw = document.documentElement.getAttribute(attribute) ?? '';
		try {
			return (raw ? JSON.parse(raw) : {}) as Record<string, string>;
		} catch {
			return {} as Record<string, string>;
		}
	}, 'data-ever-teams-runtime-env');

/** The branding name this lane serves. */
const servedAppName = async (page: Page) => (await servedRuntimeEnv(page))['APP_NAME'] ?? '';

/** The language name `about-page.tsx` computes, read with the same call it makes (never typed). */
const computedLanguageName = (page: Page) =>
	page.evaluate(() => {
		const locale = document.documentElement.lang || 'en';
		try {
			return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
		} catch {
			return locale;
		}
	});

/** The time zone `about-page.tsx` resolves, read with its own call. */
const computedTimeZone = (page: Page) => page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? '');

const codeSlots = (page: Page): Locator => page.locator('[aria-labelledby="join-team-code-label"] input');
const slotValues = async (page: Page) =>
	(await codeSlots(page).evaluateAll((nodes) => nodes.map((node) => (node as HTMLInputElement).value))).join('');
const fillJoinCode = async (page: Page, code: string) => {
	for (let index = 0; index < code.length; index += 1) await codeSlots(page).nth(index).fill(code[index]);
};

const sectionLinkFacts = (page: Page, sectionId: string) =>
	page.locator(`section[aria-labelledby="${sectionId}"] a`).evaluateAll((nodes) =>
		nodes.map((node) => ({
			href: node.getAttribute('href'),
			target: node.getAttribute('target'),
			rel: node.getAttribute('rel'),
			text: (node.textContent ?? '').trim()
		}))
	);

const versionLinkFacts = (page: Page) =>
	page.locator('section[aria-labelledby="about-version-details"] a').evaluateAll((nodes) =>
		nodes.map((node) => ({
			href: node.getAttribute('href'),
			target: node.getAttribute('target'),
			rel: node.getAttribute('rel'),
			title: node.getAttribute('title')
		}))
	);

const mockCalls = (traffic: Traffic) =>
	traffic
		.calls()
		.filter((call) => call.origin === MOCK_ORIGIN)
		.map((call) => `${call.method} ${call.path} → ${call.status}`)
		.sort();

async function openSignedIn(page: Page, context: BrowserContext, fixture: BootstrapFixture) {
	await signInWithFixture(context, fixture, 'A');
	await stubNextAuthSession(page);
}

test.describe('lane-b · /about as the browser renders it', () => {
	test('the page as printed: heading, licence, version rows with a served version, the rows this lane shows, the GitHub links, the branding list this lane serves, the version read', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const traffic = await guardHosts(context);
		await serveVersion(page);
		await openSignedIn(page, context, fixture);
		await hardVisit(page, '/about');

		const served = await servedRuntimeEnv(page);
		const appName = served['APP_NAME'] ?? '';
		await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(appName);
		const license = page.getByRole('link', { name: LICENSE_NAME, exact: true });
		await expect(license).toHaveAttribute('href', 'https://github.com/ever-co/ever-teams/blob/HEAD/LICENSE');
		await expect(license).toHaveAttribute('target', '_blank');
		await expect(license).toHaveAttribute('rel', 'noopener noreferrer');

		const version = page.locator('section[aria-labelledby="about-version-details"]');
		await expect(version.getByRole('heading', { name: T.VERSION_DETAILS })).toBeVisible();
		await expect(version).toContainText(T.API_CONNECTED);
		await expect(version).toContainText(T.WEB_APP);
		await expect(version).toContainText(WEB_VERSION); // next.config.js:148 + apps/web/package.json (probe-run-2.log P1)
		await expect(version).toContainText('dev'); // commit fallback, next.config.js:8 — CommitChip renders it as a span
		await expect(version).toContainText(`v${VERSION_BODY.version}`); // the served /version answer
		await expect(version).toContainText(shortCommit(VERSION_BODY.commit)); // getShortCommit, build-info.ts
		await expect
			.poll(() => versionLinkFacts(page), { timeout: 30_000 })
			.toEqual([
				{
					href: 'https://github.com/ever-co/ever-teams',
					target: '_blank',
					rel: 'noopener noreferrer',
					title: T.REPOSITORY
				},
				{
					href: `https://github.com/ever-co/ever-gauzy/commit/${VERSION_BODY.commit}`,
					target: '_blank',
					rel: 'noopener noreferrer',
					title: filled(EN.layout.footer.OPEN_COMMIT, { commit: VERSION_BODY.commit })
				},
				{
					href: `https://github.com/ever-co/ever-gauzy/commit/${VERSION_BODY.commit}`,
					target: '_blank',
					rel: 'noopener noreferrer',
					title: T.REPOSITORY
				}
			]); // web row end-link, API commit chip, API row end-link (probe-run-2.log P1)

		const environment = page.locator('section[aria-labelledby="about-environment"]');
		await expect(environment.getByRole('heading', { name: T.ENVIRONMENT })).toBeVisible();
		await expect
			.poll(
				() =>
					environment
						.locator('dt')
						.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim())),
				{ timeout: 30_000 }
			)
			.toEqual([T.BUILD, T.MODE, T.RUNNING_IN, T.API_ADDRESS, T.LANGUAGE, T.TIME_ZONE]);
		await expect
			.poll(
				async () =>
					environment
						.locator('dd')
						.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim())),
				{ timeout: 30_000 }
			)
			.toEqual([
				T.BUILD_DEVELOPMENT,
				T.MODE_STANDARD,
				T.RUNNING_IN_BROWSER,
				new URL(MOCK_ORIGIN).origin, // the served GAUZY_API_BASE_SERVER_URL.value
				await computedLanguageName(page),
				await computedTimeZone(page)
			]);
		await expect(environment.getByText(T.DEPLOYMENT)).toHaveCount(0); // no NEXT_PUBLIC_SENTRY_ENVIRONMENT served

		// The lane serves operator branding, so "Learn more" IS here (header finding; probe-run-5a.log R3). Every
		// address and name is the served payload's own; the app link is labelled by its host (about-info.ts).
		const branding = ['APP_LINK', 'COMPANY_LINK', 'COMPANY_NAME', 'TERMS_LINK', 'PRIVACY_POLICY_LINK'].map(
			(key) => served[key] ?? ''
		);
		expect(branding.every(Boolean), `the lane no longer serves all its branding: ${JSON.stringify(branding)}`).toBe(
			true
		);
		const [appLink, companyLink, companyName, termsLink, privacyLink] = branding;
		const learnMore = page.locator('section[aria-labelledby="about-learn-more"]');
		await expect(learnMore.getByRole('heading', { name: T.LEARN_MORE })).toBeVisible();
		await expect
			.poll(() => sectionLinkFacts(page, 'about-learn-more'), { timeout: 30_000 })
			.toEqual([
				{ href: appLink, target: '_blank', rel: 'noopener noreferrer', text: new URL(appLink).host },
				{ href: companyLink, target: '_blank', rel: 'noopener noreferrer', text: companyName },
				{ href: termsLink, target: '_blank', rel: 'noopener noreferrer', text: EN.layout.footer.TERMS },
				{
					href: privacyLink,
					target: '_blank',
					rel: 'noopener noreferrer',
					text: EN.layout.footer.PRIVACY_POLICY
				}
			]);

		await expect
			.poll(() => sectionLinkFacts(page, 'about-github'), { timeout: 30_000 })
			.toEqual([
				{
					href: 'https://github.com/ever-co/ever-teams',
					target: '_blank',
					rel: 'noopener noreferrer',
					text: T.REPOSITORY
				},
				{
					href: 'https://github.com/ever-co/ever-teams/releases',
					target: '_blank',
					rel: 'noopener noreferrer',
					text: T.RELEASES
				},
				{
					href: 'https://github.com/ever-co/ever-teams/issues',
					target: '_blank',
					rel: 'noopener noreferrer',
					text: T.ISSUES
				},
				{
					href: 'https://github.com/ever-co/ever-teams/pulls',
					target: '_blank',
					rel: 'noopener noreferrer',
					text: T.PULL_REQUESTS
				},
				{
					href: 'https://github.com/ever-co/ever-teams/graphs/contributors',
					target: '_blank',
					rel: 'noopener noreferrer',
					text: T.CONTRIBUTORS
				},
				{
					href: 'https://github.com/ever-co/ever-teams/blob/HEAD/.github/CONTRIBUTING.MD',
					target: '_blank',
					rel: 'noopener noreferrer',
					text: T.CONTRIBUTING
				},
				{
					href: 'https://github.com/ever-co/ever-gauzy',
					target: '_blank',
					rel: 'noopener noreferrer',
					text: T.API_REPOSITORY
				}
			]); // about-info.ts getRepositoryLinks + the API_REPOSITORY row

		await expect
			.poll(() => mockCalls(traffic).filter((call) => call === 'GET /api/version → 200').length, {
				timeout: 30_000
			})
			.toBeGreaterThan(0); // the version read really went to the lane mock
		report('about reads (mock origin, sorted)', mockCalls(traffic));
		expectAllowedHosts(traffic, 'the about page as it opened');
		expect(consoleFindings(shield), 'the about page reported a console error of its own').toEqual([]);
		expect(shield.pageErrors(), 'the about page threw').toEqual([]);
	});

	test('the version read refused (500): the unreachable state, Retry and the read it sends, then a good answer', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const GOOD_VERSION = { name: 'Ever Gauzy', version: '9.9.9', commit: 'deadbeefcafebabe' };
		const state = { good: false };
		await serveVersion(page, {
			mode: () =>
				state.good
					? { status: 200, body: GOOD_VERSION }
					: { status: 500, body: { statusCode: 500, message: 'probe refuses the version' } }
		});
		await openSignedIn(page, context, fixture);
		await hardVisit(page, '/about');

		const version = page.locator('section[aria-labelledby="about-version-details"]');
		await expect(version).toContainText(T.API_UNREACHABLE, { timeout: 60_000 });
		const retry = version.getByRole('button', { name: EN.whatsNew.RETRY });
		await expect(retry).toBeVisible();

		const versionReads = () => mockCalls(traffic).filter((call) => call.startsWith('GET /api/version')).length;
		await expect.poll(versionReads, { timeout: 30_000 }).toBeGreaterThan(0);
		const readsBeforeRetry = versionReads();
		await retry.click({ timeout: 15_000 });
		await expect.poll(versionReads, { timeout: 30_000 }).toBeGreaterThan(readsBeforeRetry); // Retry sent another read
		await expect(version).toContainText(T.API_UNREACHABLE); // still refused: still unreachable

		state.good = true; // the server gets well; the retry stays visible while the last read failed
		await retry.click({ timeout: 15_000 });
		await expect(version).toContainText(`v${GOOD_VERSION.version}`, { timeout: 30_000 });
		await expect(version).toContainText(T.API_CONNECTED);
		await expect(version.getByRole('button', { name: EN.whatsNew.RETRY })).toHaveCount(0); // connected → no retry
		// the two end-links are icon-only (text "", name from the title attribute); the chip text is the short commit
		await expect(version.locator('a')).toHaveText(['', shortCommit(GOOD_VERSION.commit), '']);

		report('version 500→good mock reads', mockCalls(traffic));
		expect(armedHttpErrors(shield), 'an un-armed console error during the refused version read').toEqual([]);
		expectAllowedHosts(traffic, 'the about page through its version outage');
	});

	test('the version read still pending: the checking state, then the answer arrives', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const held = await serveVersion(page, { hold: true });
		await openSignedIn(page, context, fixture);
		await hardVisit(page, '/about');

		const version = page.locator('section[aria-labelledby="about-version-details"]');
		await expect(version).toContainText(T.API_CHECKING, { timeout: 60_000 });
		held.release();
		await expect(version).toContainText(`v${VERSION_BODY.version}`, { timeout: 30_000 });
		await expect(version).toContainText(T.API_CONNECTED);
		expectAllowedHosts(traffic, 'the about page while the version read was held');
		expect(consoleFindings(shield), 'the held version read reported a console error').toEqual([]);
	});

	test('with the branding overridden to the mock origin: the list as printed, a javascript:/malformed/credential address left out, and nothing when the operator set none', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const traffic = await guardHosts(context);
		// Every served branding URL points at the lane mock; the javascript: one must be refused, not fetched.
		await overrideRuntimeEnv(page, {
			APP_LINK: `${MOCK_ORIGIN}/app`,
			COMPANY_LINK: `${MOCK_ORIGIN}/company`,
			COMPANY_NAME: 'Probe Company Ltd',
			TERMS_LINK: 'javascript:alert(1)',
			PRIVACY_POLICY_LINK: `${MOCK_ORIGIN}/privacy`
		});
		await serveVersion(page);
		await openSignedIn(page, context, fixture);
		await hardVisit(page, '/about');

		await expect(page.locator('section[aria-labelledby="about-learn-more"]')).toBeVisible();
		await expect
			.poll(() => sectionLinkFacts(page, 'about-learn-more'), { timeout: 30_000 })
			.toEqual([
				{
					href: `${MOCK_ORIGIN}/app`,
					target: '_blank',
					rel: 'noopener noreferrer',
					text: new URL(MOCK_ORIGIN).host // the app branding link is labelled by its host (about-info.ts)
				},
				{
					href: `${MOCK_ORIGIN}/company`,
					target: '_blank',
					rel: 'noopener noreferrer',
					text: 'Probe Company Ltd'
				},
				{
					href: `${MOCK_ORIGIN}/privacy`,
					target: '_blank',
					rel: 'noopener noreferrer',
					text: EN.layout.footer.PRIVACY_POLICY
				}
			]); // the javascript: TERMS link is left out (probe-run-4.log Q5)

		// Malformed and credential-carrying addresses are refused (about-info.test.ts:58-67); the other two turned off.
		await overrideRuntimeEnv(page, {
			APP_LINK: 'https://[bad',
			COMPANY_LINK: 'http://user:secret@127.0.0.1:3996/private',
			TERMS_LINK: '',
			PRIVACY_POLICY_LINK: ''
		});
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(page.locator('section[aria-labelledby="about-version-details"]')).toBeVisible({ timeout: 60_000 });
		await expect(page.locator('section[aria-labelledby="about-learn-more"]')).toHaveCount(0);

		// Nothing set by the operator: no aside at all (about-info.test.ts:23-32).
		await overrideRuntimeEnv(page, { APP_LINK: '', COMPANY_LINK: '', TERMS_LINK: '', PRIVACY_POLICY_LINK: '' });
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(page.locator('section[aria-labelledby="about-version-details"]')).toBeVisible({ timeout: 60_000 });
		await expect(page.locator('section[aria-labelledby="about-learn-more"]')).toHaveCount(0);

		expectAllowedHosts(traffic, 'the branding override never left the lane');
		expect(consoleFindings(shield), 'the branding override states reported a console error').toEqual([]);
	});
});

test.describe('lane-b · /about copy buttons (clipboard permissions for this test only)', () => {
	test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

	test('Copy details puts exactly the page’s summary on the clipboard; the API-address button puts the address', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const traffic = await guardHosts(context);
		await serveVersion(page);
		await openSignedIn(page, context, fixture);
		await hardVisit(page, '/about');

		const appName = await servedAppName(page);
		const language = await computedLanguageName(page);
		const timeZone = await computedTimeZone(page);
		const expectedSummary = [
			appName,
			`${T.WEB_APP}: ${WEB_VERSION} (dev)`,
			`${T.API}: v${VERSION_BODY.version} (${VERSION_BODY.commit})`,
			`${T.BUILD}: ${T.BUILD_DEVELOPMENT}`,
			`${T.MODE}: ${T.MODE_STANDARD}`,
			`${T.RUNNING_IN}: ${T.RUNNING_IN_BROWSER}`,
			`${T.API_ADDRESS}: ${new URL(MOCK_ORIGIN).origin}`,
			`${T.LANGUAGE}: ${language}`,
			`${T.TIME_ZONE}: ${timeZone}`
		].join('\n');

		await page.getByRole('button', { name: T.COPY_DETAILS }).click({ timeout: 15_000 });
		await expect(page.getByText(T.COPIED)).toBeVisible({ timeout: 15_000 });
		// `formatAboutDetails` joins rows with '\n' (about-info.ts:107); Chromium on Windows hands the system
		// clipboard CRLF line endings (dev run 2026-11-27: every line but the last ended with \r\n on read-back).
		// Line endings are the platform's; every VALUE line stays pinned exactly, so only the endings are normalized.
		await expect
			.poll(
				async () => {
					const raw = await page.evaluate(() => window.navigator.clipboard.readText());
					report('copy details clipboard raw', raw);
					return raw.replace(/\r\n/g, '\n');
				},
				{ timeout: 15_000 }
			)
			.toBe(expectedSummary);

		await page.locator(`section[aria-labelledby="about-environment"] button[aria-label="${T.COPY}"]`).click({
			timeout: 15_000
		});
		await expect
			.poll(() => page.evaluate(() => window.navigator.clipboard.readText()), { timeout: 15_000 })
			.toBe(new URL(MOCK_ORIGIN).origin);

		expectAllowedHosts(traffic, 'the about copy buttons');
		expect(consoleFindings(shield), 'the copy buttons reported a console error').toEqual([]);
	});
});

test.describe('lane-b · /maintenance', () => {
	test('signed out: the notice as printed, the Try again link as printed, and where the page itself goes', async ({
		page,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		await page.goto(`${APP_ORIGIN}/maintenance`, { waitUntil: 'domcontentloaded' });

		const appName = await servedAppName(page);
		await expect(
			page.getByText(filled(EN.pages.systemPages.MAINTENANCE_TITLE, { appName }), { exact: true })
		).toBeVisible({ timeout: 60_000 });
		await expect(page.getByText(EN.pages.systemPages.MAINTENANCE_TEXT, { exact: true })).toBeVisible();
		const tryAgain = page.getByRole('link', { name: EN.pages.unauthorized.TRY_AGAIN }); // <Button asChild><Link href="/">
		await expect(tryAgain).toBeVisible();
		await expect(tryAgain).toHaveAttribute('href', '/');

		// The page does not stay: the app itself bounces the anonymous visitor to the sign-in page (header finding).
		await expect.poll(() => page.url(), { timeout: 60_000 }).toContain('/auth/passcode');
		await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(
			filled(EN.auth.signIn.TITLE, { appName })
		);

		expect(mockCalls(traffic), 'the maintenance page asked the mock for anything').toEqual([]);
		expectAllowedHosts(traffic, 'the maintenance page signed out');
		expect(consoleFindings(shield), 'the maintenance page reported a console error').toEqual([]);
	});

	test('signed in: the same notice, then the app takes the session to the home shell', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const traffic = await guardHosts(context);
		await openSignedIn(page, context, fixture);
		await page.goto(`${APP_ORIGIN}/maintenance`, { waitUntil: 'domcontentloaded' });

		const appName = await servedAppName(page);
		await expect(
			page.getByText(filled(EN.pages.systemPages.MAINTENANCE_TITLE, { appName }), { exact: true })
		).toBeVisible({ timeout: 60_000 });
		await expect(page.getByRole('link', { name: EN.pages.unauthorized.TRY_AGAIN })).toBeVisible();

		await expect.poll(() => page.url(), { timeout: 60_000 }).toBe(`${APP_ORIGIN}/`);
		await expect(page.getByRole('heading', { name: fixture.names.teamA })).toBeVisible({ timeout: 30_000 }); // the home shell names the team

		expectAllowedHosts(traffic, 'the maintenance page signed in');
		expect(consoleFindings(shield), 'the signed-in maintenance visit reported a console error').toEqual([]);
	});
});

test.describe('lane-b · /team/join', () => {
	test('signed out: the form as printed — no account line, nothing prefilled, and no API write on load', async ({
		page,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		await page.goto(`${APP_ORIGIN}/team/join`, { waitUntil: 'domcontentloaded' });

		const appName = await servedAppName(page);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(J.TITLE);
		await expect(page.getByText(J.DESCRIPTION, { exact: true })).toBeVisible();
		await expect(page.getByText(J.EMAIL_LABEL, { exact: true })).toBeVisible();
		await expect(page.locator('input[name="email"]')).toHaveValue('');
		await expect(page.locator('input[name="email"]')).toHaveAttribute('placeholder', EN.form.EMAIL_PLACEHOLDER);
		await expect(page.getByText(J.CODE_LABEL, { exact: true })).toBeVisible();
		await expect(codeSlots(page)).toHaveCount(8); // the invitation code is eight slots
		await expect(page.getByText(J.NO_CODE, { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: J.SEND_AGAIN })).toBeVisible();
		await expect(page.getByRole('button', { name: J.SUBMIT, exact: true })).toBeVisible();
		const backLink = page.getByRole('link', { name: filled(J.BACK, { appName }) });
		await expect(backLink).toBeVisible();
		await expect(backLink).toHaveAttribute('href', '/');
		await expect(page.getByText(J.SIGNED_IN_AS)).toHaveCount(0); // no account line for an anonymous visitor

		expect(mockCalls(traffic), 'the join page sent anything to the mock on load').toEqual([]);
		expect(await sessionCookies(page.context()), 'a signed-out join visit holds session cookies').toEqual([]);
		expectAllowedHosts(traffic, 'the join page signed out');
		expect(consoleFindings(shield), 'the join page reported a console error').toEqual([]);
	});

	test('signed in: the account line, the email prefilled from the session, and what "Not you?" does', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const traffic = await guardHosts(context);
		await openSignedIn(page, context, fixture);
		await page.goto(`${APP_ORIGIN}/team/join`, { waitUntil: 'domcontentloaded' });

		await expect(page.getByText(J.SIGNED_IN_AS, { exact: true })).toBeVisible({ timeout: 60_000 });
		await expect(page.getByText(fixture.names.user, { exact: true })).toBeVisible();
		await expect(page.locator('input[name="email"]')).toHaveValue(MOCK_EMAIL, { timeout: 30_000 });

		await page.getByRole('button', { name: J.NOT_YOU }).click({ timeout: 15_000 });
		await expect.poll(() => page.url(), { timeout: 60_000 }).toContain('/auth/passcode');
		await expect(page.getByText(J.SIGNED_IN_AS)).toHaveCount(0);
		const cookieNames = (await page.context().cookies()).map((cookie) => cookie.name);
		expect(cookieNames, '"Not you?" signs the session out of the jar').not.toContain('auth-token');
		expect(cookieNames, '"Not you?" signs the session out of the jar').not.toContain('auth-refresh-token');

		expectAllowedHosts(traffic, 'the join page signed in');
		expect(consoleFindings(shield), 'the signed-in join visit reported a console error').toEqual([]);
	});

	test('with a good code typed in: the write it sends, the confirm endpoint it never sends, and where the join lands', async ({
		page,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const login = await servePost(page, '/api/auth/login', {
			status: 200,
			body: {
				user: { id: 'probe-user', email: JOIN_EMAIL },
				token: 'probe-token-1',
				refresh_token: 'probe-refresh-2'
			}
		});
		const confirm = await servePost(page, '/api/auth/signin.email/confirm', {
			status: 404,
			body: { message: 'the join button must not reach confirm' }
		});

		await page.goto(`${APP_ORIGIN}/team/join`, { waitUntil: 'domcontentloaded' });
		const appName = await servedAppName(page);
		await page.locator('input[name="email"]').fill(JOIN_EMAIL);
		await fillJoinCode(page, JOIN_CODE);
		await page.getByRole('button', { name: J.SUBMIT, exact: true }).click({ timeout: 15_000 });

		await expect.poll(() => login.count(), { timeout: 30_000 }).toBe(1);
		const [body] = login.bodies();
		report('join submit body keys', Object.keys(body).sort());
		expect(
			Object.keys(body).sort(),
			'the sign-in write body (handleSubmit → verifyPasscodeRequest → signInWithEmailAndCode)'
		).toEqual(['code', 'email']);
		expect(body.email, 'the write confirmed the wrong address').toBe(JOIN_EMAIL);
		expect(body.code, 'the write carried a different code').toBe(JOIN_CODE);

		// navigate-after-sign-in replace('/'); the door answers the sign-in page (the URL may pass through `/` first)
		await expect.poll(() => page.url(), { timeout: 60_000 }).toContain('/auth/passcode');
		await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(
			filled(EN.auth.signIn.TITLE, { appName })
		);
		// Quiet window (one of this file's two absence checks): 1.5 s after landing, the confirm endpoint is still unasked.
		await page.waitForTimeout(1_500); // quiet window: the button path must not reach confirm
		expect(confirm.count(), 'the button path touched the confirm endpoint').toBe(0);

		const cookieNames = (await page.context().cookies()).map((cookie) => cookie.name);
		expect(cookieNames, 'the served sign-in wrote its token cookie').toContain('auth-token');
		expect(cookieNames, 'the served sign-in wrote its refresh cookie').toContain('auth-refresh-token');
		report('join success mock calls', mockCalls(traffic));
		expectAllowedHosts(traffic, 'the join page with a good code');
		expect(consoleFindings(shield), 'the successful join reported a console error').toEqual([]);
		expect(shield.pageErrors(), 'the successful join threw').toEqual([]);
	});

	test('with a wrong code (400 with a message, then 500): what the page says (measured: only the cleared field), nothing else sent, the form kept', async ({
		page,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const answers = [
			{ status: 400, body: { errors: { code: 'probe served refusal code line' } } },
			{ status: 500, body: { message: 'probe server broke' } }
		];
		let loginN = 0;
		await page.route(
			(url) => url.origin === MOCK_ORIGIN && url.pathname === '/api/auth/login',
			async (route) => {
				if (route.request().method() === 'OPTIONS') return answer(route, 204);
				const outcome = answers[Math.min(loginN, answers.length - 1)];
				loginN += 1;
				return answer(route, outcome.status, outcome.body);
			}
		);
		const confirm = await servePost(page, '/api/auth/signin.email/confirm', { status: 404, body: {} });

		await page.goto(`${APP_ORIGIN}/team/join`, { waitUntil: 'domcontentloaded' });
		await page.locator('input[name="email"]').fill(JOIN_EMAIL);
		await fillJoinCode(page, 'WRONGCOD');
		await page.getByRole('button', { name: J.SUBMIT, exact: true }).click({ timeout: 15_000 });

		await expect.poll(() => loginN, { timeout: 30_000 }).toBe(1);
		await expect.poll(() => slotValues(page), { timeout: 30_000 }).toBe(''); // the code field is cleared (verifyPasscodeRequest catch)
		// Measured: the served refusal text never shows, and no generic error line either (header finding, untagged).
		await expect(page.getByText('probe served refusal code line')).toHaveCount(0);
		await expect(page.getByText(EN.pages.auth.INVALID_CODE_TRY_AGAIN)).toHaveCount(0);
		await expect(page.locator('input[name="email"]')).toHaveValue(JOIN_EMAIL); // the form stays filled
		await expect(page.getByRole('button', { name: J.SUBMIT, exact: true })).toBeVisible();

		// Second attempt, a 500 this time: the same silence.
		await page.reload({ waitUntil: 'domcontentloaded' });
		await page.locator('input[name="email"]').fill(JOIN_EMAIL);
		await fillJoinCode(page, 'WRONGCOD');
		await page.getByRole('button', { name: J.SUBMIT, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => loginN, { timeout: 30_000 }).toBe(2);
		await expect.poll(() => slotValues(page), { timeout: 30_000 }).toBe('');
		await expect(page.getByText('probe server broke')).toHaveCount(0);
		await expect(page.getByText(EN.pages.auth.INVALID_CODE_TRY_AGAIN)).toHaveCount(0);
		await expect(page.locator('input[name="email"]')).toHaveValue(JOIN_EMAIL);
		expect(page.url()).toContain('/team/join'); // a refused join stays on the join page

		expect(confirm.count(), 'a refused join touched the confirm endpoint').toBe(0);
		expect(
			mockCalls(traffic).filter((call) => call.startsWith('POST')),
			'only the two login writes were sent'
		).toEqual(['POST /api/auth/login → 400', 'POST /api/auth/login → 500']);
		expect(armedHttpErrors(shield), 'an un-armed console error during the refused joins').toEqual([]);
		expectAllowedHosts(traffic, 'the join page with refused codes');
	});

	test('from ?email=&code= (refused): the confirm fires by itself with includeTeams, then attempt 2, and the error the person actually sees', async ({
		page,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const confirm = await servePost(page, '/api/auth/signin.email/confirm', {
			status: 400,
			body: { errors: { code: 'probe confirm refusal line' } }
		});
		const login = await servePost(page, '/api/auth/login', {
			status: 400,
			body: { errors: { code: 'probe login refusal line' } }
		});

		await page.goto(`${APP_ORIGIN}/team/join?email=${encodeURIComponent(JOIN_EMAIL)}&code=${AUTO_CODE}`, {
			waitUntil: 'domcontentloaded'
		});

		await expect.poll(() => confirm.count(), { timeout: 30_000 }).toBe(1); // the auto-fire ran by itself
		const [confirmBody] = confirm.bodies();
		report('auto-fire confirm body', confirmBody);
		expect(confirmBody, 'the auto-fire confirm body (signInEmailConfirm)').toEqual({
			email: JOIN_EMAIL,
			code: AUTO_CODE,
			includeTeams: true
		});
		await expect.poll(() => login.count(), { timeout: 30_000 }).toBe(1); // attempt 2 followed
		const [loginBody] = login.bodies();
		expect(Object.keys(loginBody).sort(), 'attempt 2 body').toEqual(['code', 'email']);

		// [MEASURED, NOT INTENDED] What shows is the generic refusal text; the served 400 messages never show. The intent
		// is stated outright in `use-authentication-passcode.test.tsx:106` — `it('surfaces the confirm 400 errors when
		// both attempts fail', …)`, asserting `errors` = `{ code: 'expired' }` — but the browser's rejection is an
		// `ApiErrorService` (no `.response`, no `isAxiosError`), so `isAxiosError(confirmError)`
		// (use-authentication-passcode.ts:244-247) never runs and only the fallback text appears (header finding).
		await expect(page.getByText(EN.pages.auth.INVALID_CODE_TRY_AGAIN)).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText('probe confirm refusal line')).toHaveCount(0);
		await expect(page.getByText('probe login refusal line')).toHaveCount(0);
		await expect(page.locator('input[name="email"]')).toHaveValue(JOIN_EMAIL); // prefilled from ?email
		await expect.poll(() => slotValues(page), { timeout: 30_000 }).toBe('');
		expect(page.url()).toContain(`code=${AUTO_CODE}`); // the query is left in the address

		expect(armedHttpErrors(shield), 'an un-armed console error during the refused auto-fire').toEqual([]);
		expectAllowedHosts(traffic, 'the join page auto-fire');
	});

	test('from ?email=&code= (accepted): confirm signs in by itself, attempt 2 never runs, and the landing is the app door', async ({
		page,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const confirm = await servePost(page, '/api/auth/signin.email/confirm', {
			status: 200,
			body: {
				user: { id: 'probe-user', email: JOIN_EMAIL },
				token: 'probe-token-1',
				refresh_token: 'probe-refresh-2'
			}
		});
		const login = await servePost(page, '/api/auth/login', { status: 200, body: {} });

		await page.goto(`${APP_ORIGIN}/team/join?email=${encodeURIComponent(JOIN_EMAIL)}&code=${AUTO_CODE}`, {
			waitUntil: 'domcontentloaded'
		});
		const appName = await servedAppName(page);

		await expect.poll(() => confirm.count(), { timeout: 30_000 }).toBe(1);
		await expect.poll(() => page.url(), { timeout: 60_000 }).toContain('/auth/passcode');
		await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(
			filled(EN.auth.signIn.TITLE, { appName })
		);
		// Quiet window (the other absence check): 1.5 s after landing, attempt 2 (`/auth/login`) is still unsent.
		await page.waitForTimeout(1_500); // quiet window: a signed-in confirm does not run attempt 2
		expect(login.count(), 'a signed-in confirm still ran attempt 2').toBe(0);

		const cookieNames = (await page.context().cookies()).map((cookie) => cookie.name);
		expect(cookieNames, 'the confirm sign-in wrote its token cookie').toContain('auth-token');
		report('auto-fire success mock calls', mockCalls(traffic));
		expectAllowedHosts(traffic, 'the join page auto-fire success');
		expect(consoleFindings(shield), 'the accepted auto-fire reported a console error').toEqual([]);
	});

	test('"Send it again": the code write and the SEND_AGAIN_IN cooldown, driven by the page clock', async ({
		page,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		await page.clock.install();
		const resend = await servePost(page, '/api/auth/signin.email', {
			status: 200,
			body: { status: 200, message: 'probe code sent' }
		});
		await page.goto(`${APP_ORIGIN}/team/join`, { waitUntil: 'domcontentloaded' });
		await page.locator('input[name="email"]').fill(JOIN_EMAIL);
		await page.getByRole('button', { name: J.SEND_AGAIN }).click({ timeout: 15_000 });

		await expect.poll(() => resend.count(), { timeout: 30_000 }).toBe(1);
		const [body] = resend.bodies();
		report('resend body', Object.keys(body).sort());
		expect(body.email, 'the code went to the wrong address').toBe(JOIN_EMAIL);
		expect(
			body.appMagicSignUrl,
			'the code e-mail would not link back to this app (signInCodeRequestBody appMagicSignUrl)'
		).toBe(`${APP_ORIGIN}/auth/passcode`);
		expect(Object.keys(body).sort(), 'the code request body (email + appEmailBranding + appMagicSignUrl)').toEqual([
			'appLink',
			'appLogo',
			'appMagicSignUrl',
			'appName',
			'appSignature',
			'companyLink',
			'companyName',
			'email'
		]);

		await expect(page.getByRole('button', { name: filled(J.SEND_AGAIN_IN, { countdown: '01:00' }) })).toBeVisible({
			timeout: 15_000
		});
		await page.clock.fastForward('00:01');
		await expect(page.getByRole('button', { name: filled(J.SEND_AGAIN_IN, { countdown: '00:59' }) })).toBeVisible({
			timeout: 15_000
		});

		// The countdown is a 1 s setTimeout chain (use-resend-cooldown.ts): step the clock 1 s at a time until the
		// cooldown lifts — the resend stays the only disabled button for the whole 60 s, then none is disabled.
		await expect
			.poll(
				async () => {
					await page.clock.fastForward('00:01');
					return page.locator('button[disabled]').count();
				},
				{ timeout: 120_000 }
			)
			.toBe(0);
		await expect(page.getByRole('button', { name: J.SEND_AGAIN })).toBeEnabled();

		expectAllowedHosts(traffic, 'the join page resend');
		expect(consoleFindings(shield), 'the resend reported a console error').toEqual([]);
	});

	test('when "Send it again" is refused (400 with a message): nothing shows and no cooldown starts [MEASURED, NOT INTENDED]', async ({
		page,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const resend = await servePost(page, '/api/auth/signin.email', {
			status: 400,
			body: { errors: { email: 'probe send refusal line' } }
		});
		await page.goto(`${APP_ORIGIN}/team/join`, { waitUntil: 'domcontentloaded' });
		await page.locator('input[name="email"]').fill(JOIN_EMAIL);
		await page.getByRole('button', { name: J.SEND_AGAIN }).click({ timeout: 15_000 });

		await expect.poll(() => resend.count(), { timeout: 30_000 }).toBe(1);
		// The refusal has been handled before anything is checked absent: the client logged it, and the send is over
		// (the resend button is hidden while `signInEmailLoading`, join-team-page.tsx `showsResend`).
		await expect
			.poll(() => shield.consoleErrors().filter((line) => line.includes('[HttpClient] HTTP Error')).length, {
				timeout: 30_000
			})
			.toBeGreaterThan(0);
		await expect(page.getByRole('button', { name: J.SEND_AGAIN })).toBeVisible(); // still just "Send it again"
		// The page's comment (join-team-page.tsx:55) states the second half — `// Only a code that went out starts the
		// wait; the hook already shows the error of a failed send` — and only the first half holds in the browser:
		// measured (probe-run-5b.log R7 `send refusal shown false`) the served message never shows and no error line
		// appears anywhere; only the armed `[HttpClient] HTTP Error` console line records the refusal.
		await expect(page.getByText('probe send refusal line')).toHaveCount(0);
		await expect(page.getByRole('button', { name: J.SEND_AGAIN_IN.replace('{countdown}', '') })).toHaveCount(0); // no countdown started
		await expect(page.locator('input[name="email"]')).toHaveValue(JOIN_EMAIL);

		expect(armedHttpErrors(shield), 'an un-armed console error during the refused resend').toEqual([]);
		expectAllowedHosts(traffic, 'the join page refused resend');
	});
});
