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
 * - `app/[locale]/layout-component.tsx:41-43` (`ClientOnly`, `ssr: false`): no page content and no form exist in the
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

	test('an ungated family serves its page to a signed-out browser, and that page drives the API with no token', async ({
		anon,
		mock
	}) => {
		// `/invoices` matches no pattern in `PROTECTED_APP_URL_PATHS` (constants.tsx:116-133), so the door serves the
		// document and the client decides. Finding, pinned and not approved: the reads go out, and none of them
		// carries a bearer — which a real Gauzy would answer 401 (AUDIT finding 13: this mock is
		// authentication-blind, so a 200 here proves what the app *sent*, never who accepted it).
		const page = await anon('/invoices');
		console.log(`[lane-d] signed-out /invoices ended at ${page.url()}`);
		await expect(page, `the door refused ${page.url()} — /invoices is no longer ungated`).toHaveURL(/\/invoices/);

		const log = await mockRequestsWhen((entries) => entries.some((request) => request.path.startsWith('/api/')), {
			tries: 40,
			intervalMs: 250
		});
		const paths = [...new Set(log.map((request) => request.path))];
		const withBearer: string[] = [];
		for (const path of paths) {
			const tokens = await receivedTokens(path);
			if (tokens.length > 0) withBearer.push(`${path} (${tokens.length})`);
		}
		console.log(`[lane-d] signed-out /invoices asked: ${logLines(log).join(', ')}`);
		expect(
			log.length,
			`an anonymous /invoices visit asked this lane's mock nothing (${logLines(log).join(', ')}) — the page no longer mounts its reads without a session`
		).toBeGreaterThan(0);
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
