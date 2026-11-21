import { expect, test } from '../../fixtures';
import { APP_ORIGIN, hardVisit, mockRequestsWhen, receivedTokens, signInWithFixture, stubNextAuthSession } from '../../helpers';
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

test.describe('lane-d · what a signed-out browser is actually given', () => {
	for (const path of ['/board', '/chat', '/goals']) {
		test(`${path} bounces to the sign-in affordance, not to a page`, async ({ anon, mock }) => {
			const page = await anon(path);
			console.log(`[lane-d] browser followed ${path} to ${page.url()}`);

			await expect(
				page,
				`a signed-out visitor is sitting on ${path} — the door's 307 (proxy.ts:519-522) no longer takes them off it`
			).not.toHaveURL(new RegExp(path));
			await expect(page.getByText(UNAUTHORIZED_TITLE), `the bounced page does not show "${UNAUTHORIZED_TITLE}"; it says: ${await page
				.locator('body')
				.innerText()
				.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 300))}`).toBeVisible();
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

	test('an ungated family leaves a signed-out browser in a permanent "Loading" shell that asks the API nothing — pinned, not approved', async ({
		anon,
		mock
	}) => {
		// Finding D-7, answered by the browser run (1 failed / 6 passed, `E:\Coding\.tmp\lane-d-browser1.log`) — and the
		// answer is not the one this case predicted. It expected token-less reads to go out; what the page actually does
		// is ask for nothing at all. Both halves are pinned, from the run's own evidence:
		//
		//   URL        http://localhost:3034/invoices  (no bounce: `PROTECTED_APP_URL_PATHS`, constants.tsx:117-132,
		//              names no pattern for `invoices`, so the door served the document)
		//   what is rendered  the app shell with no session — the snapshot at
		//              `apps/web/playwright/artifacts/test-results-lane-d/lane-d-page-gate-browser-l-11a4f-rives-the-API-with-no-token-lane-d/error-context.md`
		//              reads `button "Current workspace: No workspace. Click to change the workspace"`, the full sidebar
		//              (Home / Calendar / Meetings / Assistant / Dashboard / Favorites / Tasks / Projects / Clients / My
		//              work), `heading level=1: Invoices`, and inside the page's own `main` a single `status: Loading`.
		//              No login form, no sign-in link, no page data — a visitor is left in a spinner.
		//   the mock log   empty, over a window four times wider than the one that timed out in the first run.
		//
		// The first run waited 40 × 250 ms for any `/api/*` entry and never saw one, which is why the old assertion
		// (`toBeGreaterThan(0)`) timed out rather than failed. The window below is 40 × 500 ms after
		// `networkidle`, and the expectation is the measured 0. That is the finding re-pinned to what the browser did,
		// not the red removed: if the page ever starts asking again, this case goes red and says so.
		// This case gets its own 7-minute budget (the config's is 180 s per test) because the mount time is measured,
		// not guessed: the shell was up by **12.9 s** in `lane-d-browser1.log`, by **66 s** in `lane-d-browser3.log`,
		// and was still not up after **120 s** in `lane-d-browser4.log` — all on the same warm `next dev`, with free RAM
		// between 3.4 and 4.6 GB and `strata` holding ~11.4 GB. A page-gate case that renders a 448 KB client-only
		// document is the most expensive thing in this lane on this PC, and the honest fix is to give it room, not to
		// drop the render assertions.
		test.setTimeout(420_000);
		const page = await anon('/invoices');
		console.log(`[lane-d] signed-out /invoices ended at ${page.url()}`);
		await expect(page, `the door refused ${page.url()} — /invoices is no longer ungated`).toHaveURL(/\/invoices/);

		// What the visitor is shown. The heading is asserted with a wide window because the two runs disagree about
		// *when* it appears, and that is itself worth pinning: run 1's failure snapshot (taken 12.9 s into the test)
		// already has `heading level=1: Invoices`, while run 2's `getByRole('heading', { name: 'Invoices' })` found
		// nothing inside the 15 s `expect` default — so the shell mounts its page between ~3 s and ~13 s on a warm dev
		// server, and a case that asks too early reads as "the page never renders".
		const bodyAt = async (label: string) =>
			(await page.locator('body').innerText()).replace(/\s+/g, ' ').trim().slice(0, 320).replace(/^/, `[lane-d] /invoices ${label}: `);
		console.log(await bodyAt('at navigation'));
		// 120 s, not 15 s and not 60 s, and the reason is a measured fact about this PC: the served document carries no
		// body text at all (`/invoices at navigation:` printed an empty string), and the shell mounts at
		// **≤ 12.9 s** when earlier browser cases have already compiled the client chunks (run 1's snapshot, taken when
		// the case failed at 12.9 s, already shows the heading) but **only between 60 s and 66 s** when this case runs
		// alone on a cold Turbopack (`lane-d-browser3.log`: 60 s `toBeVisible` timed out, and that run's own failure
		// snapshot at 66 s shows the same shell). A page-gate case that asks "did the page render?" faster than the
		// dev server compiles it reads as "the page never renders".
		await expect(
			page.getByRole('heading', { name: 'Invoices' }),
			`no "Invoices" heading at ${page.url()} within 300 s; the page said: ${(await page.locator('body').innerText()).replace(/\s+/g, ' ').trim().slice(0, 300)}`
		).toBeVisible({ timeout: 300_000 });
		console.log(await bodyAt('once the heading is up'));
		// The page's own content area is a `status: Loading` with nothing behind it — in both failure snapshots, at
		// 12.9 s and at 66 s: `main → status → "Loading"`. A signed-out visitor of an ungated family is left in a
		// spinner, not sent to a sign-in page.
		await expect(
			page.getByText('Loading').first(),
			`the signed-out /invoices page is no longer sitting in a loading state; the page now says: ${await bodyAt('instead')}`
		).toBeVisible({ timeout: 30_000 });
		// No way to sign in from here, in either shape: the page offers no form and no link to the sign-in page.
		await expect(page.locator('form'), `a signed-out visitor is now offered a form at ${page.url()}`).toHaveCount(0);
		await expect(
			page.locator('a[href="/auth/passcode"]'),
			`a signed-out visitor is now offered a sign-in link at ${page.url()}`
		).toHaveCount(0);

		// The same 20 s doubles as the wait that settles the page and as the window the mock log is read over.
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
		console.log(`[lane-d] signed-out /invoices asked the mock, after networkidle + 20 s: ${logLines(log).join(', ') || '(nothing)'}`);
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

		await expect(html, `the Arabic page was not served with lang="ar" (${page.url()})`).toHaveAttribute('lang', 'ar');

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
			await expect(page, `${label} left the visitor on a protected page (${page.url()})`).not.toHaveURL(/settings\/personal/);
			await expect(page.getByText(UNAUTHORIZED_TITLE), `${label} did not land on the same sign-in page as the other`).toBeVisible();
		}
	});
});

test.describe('lane-d · the door does not bounce a session that is present', () => {
	test('the fixture person reaches /my-week and the door read carries their token', async ({
		page,
		context,
		fixture,
		mock
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
