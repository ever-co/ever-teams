import { expect, test } from '../../fixtures';
import type { Page } from '@playwright/test';
import {
	APP_ORIGIN,
	hardVisit,
	mockRequestsWhen,
	receivedTokens,
	signInWithFixture,
	stubNextAuthSession
} from '../../helpers';
import { logLines, mintAccessToken, sha256 } from './lane-d-session';

/**
 * The half of the gate a browser is the only way to see.
 *
 * `page-gate-lane.spec.ts` pins the door's HTTP answer (307 + `Location`) with the mock log as its witness. What the
 * door does *not* answer is what this file is for: where a browser ends up after it follows that 307, what it is
 * then shown, and what an anonymous browser does to the API on a page the door never gated.
 *
 * Copy and selectors here come from where they already work (the provenance rule):
 * - `core/components/pages/unauthorized/index.tsx:18-21` renders `pages.systemPages.UNAUTHORIZED_TITLE`,
 *   `…UNAUTHORIZED_TEXT` and `<Link href={DEFAULT_APP_PATH}>…SIGN_IN</Link>`; `DEFAULT_APP_PATH` is
 *   `/auth/passcode` in this config (`constants.tsx:98-100`).
 * - `apps/web/locales/en.json` → `pages.systemPages.UNAUTHORIZED_TITLE` = "Sign in to see this page" (and
 *   `de.json` / `ar.json` carry their own, which is why the title below is read as text and not hard-coded per
 *   locale in the app).
 * - `core/services/client/api/default.ts:23` → every page's layout health check is `GET /api/health` on the app
 *   origin (`app/api/health/route.ts`), which is the one mock entry a bounced page is expected to cause.
 * - `app/[locale]/layout-component.tsx:40-42` (`ClientOnly`, `ssr: false`): no page content and no form exist in the
 *   served HTML, so "is a login form present" is only answerable here, in a browser.
 */

const UNAUTHORIZED_TITLE = 'Sign in to see this page';

/**
 * What the page is saying, in one line, for a failure message or a log line. Read at the moment the message is built —
 * `expect(locator, message)` evaluates its message before the assertion starts polling — so every call below names the
 * instant it was read, and no red case has to guess what the page looked like.
 */
const pageWords = async (page: Page) =>
	(await page.locator('body').innerText()).replace(/\s+/g, ' ').trim().slice(0, 320);

test.describe('lane-d · what a signed-out browser is actually given', () => {
	for (const path of ['/board', '/chat', '/goals']) {
		test(`${path} bounces to the sign-in affordance, not to a page`, async ({ anon, mock }) => {
			const page = await anon(path);
			console.log(`[lane-d] browser followed ${path} to ${page.url()}`);

			await expect(
				page,
				`a signed-out visitor is sitting on ${path} — the door's 307 (proxy.ts:519-522) no longer takes them off it`
			).not.toHaveURL(new RegExp(path));
			await expect(
				page.getByText(UNAUTHORIZED_TITLE),
				`the bounced page does not show "${UNAUTHORIZED_TITLE}"; it says: ${await pageWords(page)}`
			).toBeVisible();
			await expect(
				page.locator('a[href="/auth/passcode"]'),
				'the bounced page offers no sign-in link (core/components/pages/unauthorized/index.tsx:21 → DEFAULT_APP_PATH)'
			).toHaveCount(1);

			const log = await mock.requests();
			const unexpected = log.filter((request) => request.path !== '/api/health');
			expect(
				unexpected,
				`the bounced page asked this lane's mock: ${logLines(unexpected).join(', ')} (whole log: ${logLines(log).join(', ')}) — pin what that read is if this is now today's behaviour`
			).toEqual([]);
		});
	}

	test('an ungated family leaves a signed-out browser in a permanent loading skeleton that asks the API nothing and carries no accessible page name — pinned, not approved', async ({
		anon,
		mock
	}) => {
		/**
		 * Finding D-7, measured. The door serves the document (`PROTECTED_APP_URL_PATHS`, constants.tsx:117-132, names no
		 * pattern for `invoices`), the client mounts, and the page then renders **its own loading skeleton, forever**:
		 *
		 *  - why it never loads: `withAuthentication` (`core/components/layouts/app/authenticator.tsx:80-83`) returns
		 *    `params.skeleton` while `userQuery.data` is missing, and `useUserQuery`
		 *    (`core/hooks/queries/user-user.query.ts:13-23`) is `enabled: hasToken` (`:22`, `hasToken` read from the
		 *    `auth-token` cookie at `:8-12`). Signed out there is no token, so the query is never enabled and never
		 *    settles — which is also *why the mock log stays empty*: the read that would have carried a token is switched
		 *    off before anything is asked, and `InvoicesContent` (the part that reads invoices) is never mounted at all.
		 *  - what is shown: `InvoicesPageSkeleton` (`core/components/pages/invoices/invoices-states.tsx:204-210`) inside
		 *    `PageSkeletonFrame` (`core/components/layouts/page-skeleton.tsx:97-116`), whose body is
		 *    `<div role="status" aria-live="polite" aria-busy="true">` + `<span class="sr-only">Loading</span>`
		 *    (`:110-112`), and whose "Invoices" title is the skeleton toolbar's own `<h1>` sitting inside
		 *    `<div className="px-4" aria-hidden="true">` (`invoices-states.tsx:190-193`).
		 *  - why this case was red in `lane-d-browser2/3/5/6.log`, and was never red-by-app: it asked
		 *    `getByRole('heading', { name: 'Invoices' })`. That engine matches only what the accessibility tree exposes,
		 *    and this title sits inside an `aria-hidden="true"` subtree, so no window can reach it — 15 s (browser2),
		 *    60 s (browser3), 120 s (browser5) and 300 s (browser6) each ended with `element(s) not found` **while the
		 *    same run's own failure snapshot listed `heading level=1: Invoices`** (browser6's:
		 *    `apps/web/playwright/artifacts/test-results-lane-d/lane-d-page-gate-browser-l-9f3e7-thing-—-pinned-not-approved-lane-d/error-context.md`).
		 *    The selector's failure is itself the finding, and a sharper one than "the page never renders": a signed-out
		 *    visitor of an ungated family has **no accessible page name at all** — the title they read is decorative
		 *    markup the app marks hidden from assistive technology. Both halves are pinned below from this case's own
		 *    measurement: the visible `<h1>` (a DOM-level locator + `toBeVisible`) and its absence from the a11y tree
		 *    (`getByRole` 0 / `includeHidden: true` 1 / the `aria-hidden` ancestor named).
		 *  - the mount is server-compile-bound, not client-bound: this lane's own dev-server log for browser6 says
		 *    `○ Compiling /[locale]/invoices ...` then `GET /invoices 200 in 9.7s (next.js: 9.1s, proxy.ts: 8ms,
		 *    application-code: 578ms)` — `apps/web/playwright/artifacts/lane-lane-d-server.log` — and the page's own reads
		 *    (`GET /api/health`, `GET /api/auth/session`, `POST /api/log`) follow that line, none of them to this lane's
		 *    mock. The windows below cover a cold compile of this route and nothing wider.
		 *
		 * Measured by this case itself in `E:\Coding\.tmp\lane-d-browser7.log` — `7 passed (59.0s)`, the file's first clean
		 * full-file number, on a lane warmed by the browser6 run that failed: the loading skeleton was up **4 972 ms**
		 * after navigation (1 status region, 16 chars of body text at that instant); the title measured
		 * `visibleH1 1 / accessibleHeading 0 / hiddenAwareHeading 1 / ariaHiddenAncestor div[aria-hidden="true"]`; the body
		 * 20 s later read "…Clients My work Invoices Loading" with no form and no sign-in link; and this lane's mock was
		 * asked **nothing**.
		 *
		 * Re-measured in `E:\Coding\.tmp\lane-d-browser9.log` — `7 passed (1.4m)`, `playwright exit code: 0` — once the
		 * case's body reads had been pulled into `pageWords`: the skeleton was up **10 739 ms** after navigation with 1
		 * status region and 162 chars of shell text already there, the four title measurements came back identical, and the
		 * mock was again asked `(nothing)` over the 20 s after it settled. The two runs differ only in how fast the shell
		 * came up, which is exactly why the assertions wait for the state and not for a duration.
		 * (`lane-d-browser8.log`, between them, is void for a reason unlike browser4's: this PC no longer has a bundled
		 * Chromium — `C:\Users\Evereq\AppData\Local\ms-playwright\` holds only an empty `chromium-1217\chrome-win64` — so
		 * all 7 cases died in ~5 ms on `browserType.launch` until the run was given `E2E_BROWSER_CHANNEL=chrome`, the
		 * installed Google Chrome the lane config already names.)
		 */
		test.setTimeout(300_000);
		const openedAt = Date.now();
		const page = await anon('/invoices');
		console.log(`[lane-d] signed-out /invoices ended at ${page.url()}`);
		await expect(page, `the door refused ${page.url()} — /invoices is no longer ungated`).toHaveURL(/\/invoices/);

		const bodyAt = async (label: string) => `[lane-d] /invoices ${label}: ${await pageWords(page)}`;
		const bodyWhenOpened = await bodyAt('at navigation');
		console.log(bodyWhenOpened);

		// The loading state is what the served document grows into, so it is the assertion with the wide window: the
		// client-only document (`layout-component.tsx:40-42`, `ssr: false`) carries no body text at all — every run's
		// `at navigation` line above printed an empty string — and the route's first paint waits for Turbopack to compile
		// `[locale]/invoices` (9.7 s of server time in browser6's dev log, cold). `role="status"` is the skeleton's own
		// region (`page-skeleton.tsx:110-112`); the region is counted below rather than merely found, because
		// `getByText('Loading')` would also match a sr-only span of some *other* loading region and call that the page.
		const status = page.getByRole('status');
		await expect(
			status.first(),
			// the quoted body is the one read when this window opened (`bodyWhenOpened` above), not a live read at the
			// moment of failure — `expect` builds its message before it starts polling, and a message that pretended
			// otherwise printed an empty page in browser2/3/5/6 while the skeleton was plainly there.
			`the signed-out /invoices page is no longer sitting in a loading state; when this 150 s window opened the page said ${JSON.stringify(bodyWhenOpened)}`
		).toContainText('Loading', { timeout: 150_000 });
		console.log(
			// the raw length, not `pageWords`: that one is for quoting a page into a message and is cut at 320 chars;
			// this one is a measurement of how much text the served document carries.
			`[lane-d] /invoices loading skeleton up ${Date.now() - openedAt} ms after navigation (${await status.count()} status region(s), body text ${(await page.locator('body').innerText()).length} chars)`
		);
		expect(
			await status.count(),
			'the signed-out /invoices page now reports a different number of loading regions than the one skeleton region this case pins'
		).toBe(1);

		// The title, measured at both levels — and the gap between the two levels is the finding. `locator('h1')` is
		// DOM-level and reaches an `aria-hidden` subtree; `getByRole` is accessibility-tree level and does not.
		const title = page.locator('h1', { hasText: 'Invoices' });
		const measured = {
			visibleH1: await title.count(),
			accessibleHeading: await page.getByRole('heading', { name: 'Invoices' }).count(),
			hiddenAwareHeading: await page.getByRole('heading', { name: 'Invoices', includeHidden: true }).count(),
			ariaHiddenAncestor: await title
				.first()
				.evaluate((element) => {
					const hidden = element.closest('[aria-hidden="true"]');
					return hidden ? `${hidden.tagName.toLowerCase()}[aria-hidden="true"]` : null;
				})
				.catch(() => 'no matching h1')
		};
		console.log(`[lane-d] /invoices title measured: ${JSON.stringify(measured)}`);

		await expect(
			title.first(),
			`no "Invoices" title anywhere on ${page.url()} — the skeleton stopped drawing one`
		).toBeVisible();
		expect(
			measured.visibleH1,
			`the signed-out /invoices page draws its title ${measured.visibleH1} times; the skeleton drew it once`
		).toBe(1);
		expect(
			measured.accessibleHeading,
			`finding D-7's sharp half moved: the "Invoices" title is now reachable through the accessibility tree (${measured.accessibleHeading} match(es)) — it was 0 because the skeleton's title sits inside ${measured.ariaHiddenAncestor} (core/components/pages/invoices/invoices-states.tsx:190-193), which is exactly why getByRole('heading', { name: 'Invoices' }) could not match it in browser2/3/5/6`
		).toBe(0);
		expect(
			measured.hiddenAwareHeading,
			`the title is in the DOM (${measured.visibleH1} h1) yet not reachable even with includeHidden:true (${measured.hiddenAwareHeading}) — then the h1 this case pins is not the one the page draws`
		).toBe(1);
		expect(
			measured.ariaHiddenAncestor,
			`the signed-out /invoices title's aria-hidden ancestor is now ${measured.ariaHiddenAncestor}; the skeleton hid it from assistive tech (core/components/pages/invoices/invoices-states.tsx:190-193)`
		).toBe('div[aria-hidden="true"]');
		// No way to sign in from here, in either shape: the page offers no form and no link to the sign-in page.
		await expect(page.locator('form'), `a signed-out visitor is now offered a form at ${page.url()}`).toHaveCount(
			0
		);
		await expect(
			page.locator('a[href="/auth/passcode"]'),
			`a signed-out visitor is now offered a sign-in link at ${page.url()}`
		).toHaveCount(0);

		/**
		 * The witness: 40 reads over 20 s, starting from the settled skeleton the assertions above already waited for. The
		 * loop leaves early the moment anything arrives, so a page that starts asking is reported, not missed.
		 *
		 * Hand-rolled rather than `mockRequestsWhen` (helpers.ts:212-227) on purpose: that helper **throws** when its
		 * predicate never becomes true, and here the absence is the assertion — `log.length === 0` is the finding.
		 */
		let log = await mock.requests();
		for (let attempt = 0; attempt < 40 && log.length === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 500));
			log = await mock.requests();
		}
		console.log(await bodyAt('20 s later'));
		const paths = [...new Set(log.map((request) => request.path))];
		const withBearer: string[] = [];
		for (const path of paths) {
			const tokens = await receivedTokens(path);
			if (tokens.length > 0) withBearer.push(`${path} (${tokens.length})`);
		}
		console.log(
			`[lane-d] signed-out /invoices asked the mock, over the 20 s after the skeleton settled: ${logLines(log).join(', ') || '(nothing)'}`
		);
		expect(
			log.length,
			`finding D-7 as measured: an anonymous /invoices visit asked this lane's mock nothing. It now asked ${log.length} thing(s): ${logLines(log).join(', ')} — the shell mounted its reads without a session`
		).toBe(0);
		// Kept as the invariant for the day the page does start asking: whatever it asks, it must ask without a bearer.
		expect(
			withBearer,
			`an anonymous visit sent a bearer on: ${withBearer.join(', ')} — finding D-7 pinned it as token-less`
		).toEqual([]);
	});
});

test.describe('lane-d · the RTL locale', () => {
	test('the Arabic render carries lang="ar" and no dir — the app never sets one', async ({ anon }) => {
		// `anon` (fixtures.ts:166-179) navigates without waiting for a shell, which is right here: a sign-in page has
		// none. `app/auth` pages answer 200 to an anonymous visitor, so this is the page the gate leaves alone.
		const page = await anon('/ar/auth/passcode');
		const html = page.locator('html');
		console.log(
			`[lane-d] /ar/auth/passcode → ${page.url()} lang=${JSON.stringify(await html.getAttribute('lang'))} dir=${JSON.stringify(
				await html.getAttribute('dir')
			)}`
		);

		await expect(html, `the Arabic page was not served with lang="ar" (${page.url()})`).toHaveAttribute(
			'lang',
			'ar'
		);

		// `getAttribute`, not `toHaveAttribute`: an attribute that is simply absent is what is being pinned here, and
		// Playwright's toHaveAttribute fails on a missing attribute whatever the expected value is.
		const dir = await html.getAttribute('dir');
		expect(
			dir,
			'finding D-6, the half that is verified: <html> for /ar carries no dir today — it is rendered in three places only (app/[locale]/layout-component.tsx:107-113, app/not-found.tsx:18, app/global-error.tsx:22) and none sets one. If it now carries a dir, that is the moment D-6 changed and the expectation below has to be re-read, not deleted. D-6 is NOT "the app has no RTL": core/components/pages/chat/message-item.tsx:82 + :118 set dir on the message body for ar/he, chat components use Tailwind rtl: utilities, and limit-heatmap.tsx:949 reads getComputedStyle().direction — see PLAN.md D-6 for what is still unmeasured.'
		).toBeNull();

		const direction = await page.evaluate(() => getComputedStyle(document.documentElement).direction);
		expect(
			direction,
			`finding D-6: <html> for ar computes direction ${direction}; no <html> in this app sets dir (app/[locale]/layout-component.tsx:107-113, app/not-found.tsx:18, app/global-error.tsx:22), though core/components/pages/chat/message-item.tsx:118 does set it on the chat message body for ar/he`
		).toBe('ltr');
	});

	test('a protected page under /ar/ is gated exactly like the same page with no prefix', async ({ anon }) => {
		const localized = await anon('/ar/settings/personal');
		const landedLocalized = localized.url();
		const plain = await anon('/settings/personal');
		const landedPlain = plain.url();
		console.log(`[lane-d] /ar/settings/personal → ${landedLocalized} · /settings/personal → ${landedPlain}`);

		for (const [label, page] of [
			['/ar/settings/personal', localized],
			['/settings/personal', plain]
		] as const) {
			await expect(page, `${label} left the visitor on a protected page (${page.url()})`).not.toHaveURL(
				/settings\/personal/
			);
			await expect(
				page.getByText(UNAUTHORIZED_TITLE),
				`${label} did not land on the same sign-in page as the other`
			).toBeVisible();
		}
	});
});

test.describe('lane-d · the door does not bounce a session that is present', () => {
	test('the fixture person reaches /my-week and the door read carries their token', async ({
		page,
		context,
		fixture
		// `mock` is not destructured here on purpose: it is an auto fixture (fixtures.ts:145), so the backend is reset
		// for this test whether or not the case reads it.
	}) => {
		// The mirror case AUDIT finding 11 says the api suite cannot run: it has no cookies, so it can only ever show
		// the refusal. A fresh token per case (lane-d-session.ts) keeps the 5 s session-check memo from handing this
		// case another case's answer.
		const token = mintAccessToken(fixture.ids.user, fixture.ids.organizationA, 'lane-d-mirror-my-week');
		await signInWithFixture(context, fixture, 'A');
		await context.addCookies([
			{
				name: 'auth-token',
				value: token,
				// `domain` + `path`, never `url` + `path` (helpers.ts:188-194): the app's session cookies are root-path ones.
				domain: new URL(APP_ORIGIN).hostname,
				path: '/',
				httpOnly: false,
				secure: false,
				sameSite: 'Lax'
			}
		]);
		await stubNextAuthSession(page);
		await hardVisit(page, '/my-week');

		console.log(`[lane-d] signed-in visit ended at ${page.url()}`);
		await expect(page, 'the door bounced a signed-in visitor off /my-week').toHaveURL(/\/my-week/);

		const log = await mockRequestsWhen((entries) => entries.some((request) => request.path === '/api/user/me'), {
			tries: 40,
			intervalMs: 250
		});
		const tokens = await receivedTokens('/api/user/me');
		expect(
			tokens,
			`the door read /api/user/me without this case's token (log: ${logLines(log).join(', ')})`
		).toContain(sha256(token));
	});
});
