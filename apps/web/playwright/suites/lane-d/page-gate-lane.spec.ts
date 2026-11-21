import { expect, test, type ApiCall } from '../../api-fixtures';
import { APP_ORIGIN, mockRequestsWhen, receivedTokens } from '../../helpers';
import { freshSessionCookie, logLines, sha256 } from './lane-d-session';

/**
 * The protected-page gate, over every family the app itself lists as protected — no browser, because the gate is a
 * server-side answer and a `request` fetch is far cheaper on this PC than a page.
 *
 * Source of every claim below (read, not assumed):
 *
 * - `apps/web/proxy.ts:96-112` the matcher, `:158-165` the `team/…` early return, `:175-185` `deny_redirect`,
 *   `:187-189` the pattern test, `:519-522` the anonymous refusal, `:523-546` the signed-in session check,
 *   `:583-602` the refresh-only branch.
 * - `core/constants/config/constants.tsx:114` `LOCALE_PREFIX` (13 locales) and `:116-133`
 *   `PROTECTED_APP_URL_PATHS` (16 patterns). The 7 families `suites/api/page-gate.spec.ts` never probes —
 *   `goals`, `inbox`, `favorites`, `chat`, `docs`, `about`, `workspace` — are AUDIT finding 11 and are pinned here.
 * - `core/services/server/requests/auth.ts:141-158` → `GET /user/me?relations=role&relations=tenant&includeEmployee=true`,
 *   sent by `core/services/server/fetch.ts:112` to `GAUZY_API_SERVER_URL`, which `playwright/test-servers.ts:108`
 *   points at this lane's mock: the witness is `GET /api/user/me` in the mock's own log
 *   (`cypress/support/mock-gauzy-server.mjs:1041`) plus the bearer's sha256 (`:1054`, read through
 *   `helpers.receivedTokens`). A server-side call carries no `Origin`, and the mock's origin guard only fires when
 *   one is present and untrusted (`mock-gauzy-server.mjs:978-982`), so the door's read is logged like any other.
 * - `core/services/server/same-origin-request.ts:43-46` — `refuseForeignWrite` exempts GET and HEAD at `:44`, and
 *   `proxy.ts` imports neither guard: nothing at the page door consults `Sec-Fetch-Site`. AUDIT finding 5.
 *
 * Redirects are never followed (`maxRedirects: 0`): the answer under test is the status and the `Location`. What a
 * browser makes of that `Location` is `page-gate-browser.spec.ts`.
 *
 * Sessions: each signed-in case mints its own `auth-token` (distinct `jti`, same claims as
 * `helpers.authCookieNames`) rather than reusing the shared one, because `session-check-memo.ts` reuses one check
 * per token for 5 s and `mockReset()` does not clear it — the hazard written down in
 * `suites/lane-c/session-check.spec.ts`. A fresh token also makes the `receivedTokens` hash unambiguous.
 */


/** Read, in the order `APPLICATION_LANGUAGES_CODE` lists them (`constants.tsx:567-580`); `apps/web/locales/` holds exactly these 13 JSON files. */
const LOCALES = ['en', 'fr', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es'];

/** A protected family: the pattern's first segment, a URL under it, and the page file that URL resolves to. */
type Family = { family: string; path: string; pageFile: string; alreadyPinnedByApiLane: boolean };

/** Every path here is a `find "apps/web/app/[locale]" -name page.tsx` result (see PLAN.md §2). */
const PROTECTED_FAMILIES: Family[] = [
	{ family: 'settings', path: '/settings/personal', pageFile: 'app/[locale]/(main)/settings/personal/page.tsx', alreadyPinnedByApiLane: true },
	{ family: 'settings', path: '/settings/team/members', pageFile: 'app/[locale]/(main)/settings/team/members/page.tsx', alreadyPinnedByApiLane: true },
	{ family: 'settings', path: '/settings/workspace/embeds', pageFile: 'app/[locale]/(main)/settings/workspace/embeds/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'profile', path: '/profile', pageFile: '(no page file: only app/[locale]/(main)/profile/[memberId]/page.tsx exists)', alreadyPinnedByApiLane: true },
	{ family: 'profile', path: '/profile/placeholder-member', pageFile: 'app/[locale]/(main)/profile/[memberId]/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'task', path: '/task/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', pageFile: 'app/[locale]/(main)/task/[id]/page.tsx', alreadyPinnedByApiLane: true },
	{ family: 'meet', path: '/meet', pageFile: 'app/[locale]/(main)/meet/page.tsx', alreadyPinnedByApiLane: true },
	{ family: 'board', path: '/board', pageFile: 'app/[locale]/(main)/board/page.tsx', alreadyPinnedByApiLane: true },
	{ family: 'views', path: '/views', pageFile: 'app/[locale]/(main)/views/page.tsx', alreadyPinnedByApiLane: true },
	{ family: 'work-diary', path: '/work-diary', pageFile: 'app/[locale]/(main)/work-diary/page.tsx', alreadyPinnedByApiLane: true },
	{ family: 'my-week', path: '/my-week', pageFile: 'app/[locale]/(main)/my-week/page.tsx', alreadyPinnedByApiLane: true },
	// The seven AUDIT finding 11 says nobody pins:
	{ family: 'goals', path: '/goals', pageFile: 'app/[locale]/(main)/goals/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'inbox', path: '/inbox', pageFile: 'app/[locale]/(main)/inbox/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'favorites', path: '/favorites', pageFile: 'app/[locale]/(main)/favorites/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'chat', path: '/chat', pageFile: 'app/[locale]/(main)/chat/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'chat', path: '/chat/threads', pageFile: 'app/[locale]/(main)/chat/threads/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'docs', path: '/docs', pageFile: 'app/[locale]/(main)/docs/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'about', path: '/about', pageFile: 'app/[locale]/(main)/about/page.tsx', alreadyPinnedByApiLane: false },
	{ family: 'workspace', path: '/workspace/new', pageFile: 'app/[locale]/(main)/workspace/new/page.tsx', alreadyPinnedByApiLane: false }
];

/** Page families `PROTECTED_APP_URL_PATHS` does not name, all found on disk (PLAN.md §3). Pinned as findings. */
const UNGATED_PAGE_FAMILIES = [
	'/assistant',
	'/all-teams',
	'/calendar',
	'/clients',
	'/permissions',
	'/kanban',
	'/invoices',
	'/reports/time-and-activity',
	'/delete-account',
	'/integration/github',
	'/auth/workspace'
];

/** The door's own answer, as an HTTP answer. */
async function door(api: ApiCall, path: string, options: Parameters<ApiCall>[1] = {}) {
	const response = await api(path, {
		// No session unless the case names one: a gate case that forgot its cookies must not inherit the api
		// fixture's default `Cookie:` header (api-fixtures.ts:95), which would make a "refused" case silently signed in.
		anonymous: !options?.headers?.cookie,
		...options,
		maxRedirects: 0,
		headers: {
			// A page navigation's accept, not the api fixture's JSON default, kept beside whatever else the case names.
			accept: 'text/html,application/xhtml+xml',
			...(options?.headers ?? {})
		}
	});
	const status = response.status();
	const location = response.headers()['location'] ?? '';
	const landed = location ? new URL(location, APP_ORIGIN) : null;
	const body = status >= 300 && status < 400 ? '' : await response.text();
	return { status, location, landed: landed ? `${landed.origin}${landed.pathname}` : '', body };
}

const asPage = (cookieHeader: string): Parameters<ApiCall>[1] => ({ maxRedirects: 0, headers: { cookie: cookieHeader } });

test.describe('lane-d · every protected family is refused to an anonymous visitor', () => {
	test('the site root goes to the default sign-in page', async ({ api }) => {
		// proxy.ts:176 `defaultRoute || url.pathname == DEFAULT_MAIN_PATH` → DEFAULT_APP_PATH = /auth/passcode (constants.tsx:98-100, demo mode blank).
		const answer = await door(api, '/');
		expect(answer.status, `GET / answered ${answer.status} (${answer.body.slice(0, 160)})`).toBe(307);
		expect(answer.landed, `/ redirected to ${answer.location}`).toBe(`${APP_ORIGIN}/auth/passcode`);
	});

	for (const entry of PROTECTED_FAMILIES) {
		test(`${entry.path} (${entry.family}, ${entry.pageFile}) is refused at the door`, async ({ api, mock }) => {
			const answer = await door(api, entry.path);
			expect(
				answer.status,
				`GET ${entry.path} answered ${answer.status}, not the 307 proxy.ts:519-522 gives a protected path with no token (${answer.body.slice(0, 160)})`
			).toBe(307);
			expect(answer.landed, `${entry.path} redirected to ${answer.location}, not ${APP_ORIGIN}/unauthorized`).toBe(
				`${APP_ORIGIN}/unauthorized`
			);
			// The refusal is decided before anything is asked: CASE 1 (`proxy.ts:519-522`) holds no token to ask about.
			const log = await mock.requests();
			expect(log, `the door asked this lane's mock something while refusing ${entry.path}: ${logLines(log).join(', ')}`).toEqual(
				[]
			);
		});
	}
});

test.describe('lane-d · a signed-in fixture person is not bounced', () => {
	/**
	 * Measured by lane-d's first real run (`E:\Coding\.tmp\lane-d-run1.log`, 4 failed / 77 passed): bare `/profile`
	 * answered **404** to a session, every other path here answered 200. That is finding D-3 completed — the door
	 * counts `/profile` protected (`constants.tsx:118` matches it, and an anonymous `GET /profile` really is
	 * `307 → /unauthorized`, re-probed at `E:\Coding\.tmp\lane-d-root-probe.log`), the door then lets the session
	 * through, and Next answers 404 because no page owns bare `/profile` (only
	 * `app/[locale]/(main)/profile/[memberId]/page.tsx`). A signed-in person clicking a "profile" link lands on a
	 * not-found page. Pinned at the measured number; the case is kept, not softened — the 404 body is still checked
	 * below, and the door's session read is still required, because CASE 2 (`proxy.ts:523-546`) ran *before* routing.
	 */
	const SIGNED_IN_ANSWER: Record<string, number> = { '/profile': 404 };

	for (const entry of PROTECTED_FAMILIES) {
		test(`${entry.path} is served to a session that is present`, async ({ api, mock, cookies, ids }) => {
			const { header: cookieHeader, token } = freshSessionCookie(
				cookies('A'),
				ids.user,
				ids.organizationA,
				`lane-d-door-${entry.family}-${entry.path}`
			);

			const answer = await door(api, entry.path, asPage(cookieHeader));
			expect(
				answer.status,
				`GET ${entry.path} with a session answered ${answer.status} → ${answer.location || '(no Location)'} (${answer.body.slice(0, 160)}); expected ${SIGNED_IN_ANSWER[entry.path] ?? 200}`
			).toBe(SIGNED_IN_ANSWER[entry.path] ?? 200);
			expect(answer.location, `a session present at ${entry.path} still got a Location: ${answer.location}`).toBe('');

			// The door asked this lane's mock who the session belongs to: proxy.ts:523-546 → currentAuthenticatedUserRequest
			// → GET /user/me (requests/auth.ts:141-158) → logged by the mock as /api/user/me.
			const log = await mockRequestsWhen((entries) => entries.some((request) => request.path === '/api/user/me'), {
				tries: 20,
				intervalMs: 250
			});
			const tokens = await receivedTokens('/api/user/me');
			expect(
				tokens,
				`the door read /api/user/me without forwarding this case's token; log: ${logLines(log).join(', ')}`
			).toContain(sha256(token));

			// A fetch runs no page code, so nothing else was asked: the door's read, and only it.
			const other = log.filter((request) => request.path !== '/api/user/me');
			expect(other, `the door visit asked the mock more than the session check: ${logLines(other).join(', ')}`).toEqual([]);
		});
	}
});

test.describe('lane-d · the gate does not depend on the locale prefix', () => {
	// The 2026-08-17 finding the LOCALE_PREFIX closed (constants.tsx:105-113). The api lane probes fr/de/ar/zh on
	// /settings/personal only (`suites/api/page-gate.spec.ts:75-78`); all 13 are pinned here.
	for (const locale of LOCALES) {
		test(`/${locale}/settings/personal is refused too`, async ({ api }) => {
			const answer = await door(api, `/${locale}/settings/personal`);
			expect(answer.status, `GET /${locale}/settings/personal answered ${answer.status}, not 307`).toBe(307);
			expect(answer.landed, `/${locale}/settings/personal redirected to ${answer.location}`).toBe(
				`${APP_ORIGIN}/unauthorized`
			);
		});
	}

	for (const entry of PROTECTED_FAMILIES.filter((family) => !family.alreadyPinnedByApiLane)) {
		test(`/${entry.path} is refused under pt as well`, async ({ api }) => {
			// `pt` is in the matcher (`proxy.ts:99`) and in LOCALE_PREFIX, and is outside the api lane's four locales.
			const answer = await door(api, `/pt${entry.path}`);
			expect(answer.status, `GET /pt${entry.path} answered ${answer.status}, not 307`).toBe(307);
			expect(answer.landed, `/pt${entry.path} redirected to ${answer.location}`).toBe(`${APP_ORIGIN}/unauthorized`);
		});
	}

	test('the locale-prefixed root is refused to a different page than the root, and its trailing-slash form never reaches the door — pinned, not approved', async ({
		api
	}) => {
		// Finding D-5, measured by lane-d's first run plus the probe at `E:\Coding\.tmp\lane-d-root-probe.log`. Both halves
		// of the claim are real; the *URL shape* this case first used was not, and it hid a third fact:
		//
		//   /        → 307  Location /auth/passcode      (deny_redirect's `defaultRoute || pathname == DEFAULT_MAIN_PATH`, proxy.ts:176)
		//   /en      → 307  Location /unauthorized        ← same door, different page than the root, locale dropped (:178)
		//   /fr      → 307  Location /unauthorized
		//   /ar      → 307  Location /unauthorized
		//   /en/     → 308  Location /en                  ← NOT the door: Next's own trailing-slash canonicalisation answers
		//   /fr/     → 308  Location /fr                    first, so `url.pathname == DEFAULT_MAIN_PATH` at :176 can never
		//   /ar/     → 308  Location /ar                    see a trailing-slash root at all. Following that hop lands on
		//                                                    /en → 307 → /unauthorized, i.e. the same refusal, one hop
		//                                                    longer, locale still dropped.
		// So the case as first written captured the 308 and read it as the door's answer. Pinned both ways now.
		const bare = await door(api, '/');
		expect(bare.status, `GET / answered ${bare.status}, not 307`).toBe(307);
		expect(bare.landed, `the bare root went to ${bare.location}`).toBe(`${APP_ORIGIN}/auth/passcode`);

		const lines: string[] = [`/ → ${bare.status} ${bare.location}`];
		for (const locale of ['en', 'fr', 'ar']) {
			const prefixed = await door(api, `/${locale}`);
			expect(
				prefixed.landed,
				`finding D-5: /${locale} went to ${prefixed.location} while / went to ${bare.location} (proxy.ts:176-179)`
			).toBe(`${APP_ORIGIN}/unauthorized`);
			lines.push(`/${locale} → ${prefixed.status} ${prefixed.location}`);

			const slashed = await door(api, `/${locale}/`);
			expect(
				`${slashed.status} ${slashed.landed}`,
				`finding D-5b: /${locale}/ answered ${slashed.status} → ${slashed.location}; expected Next's trailing-slash 308 to its own locale path before the door is reached`
			).toBe(`308 ${APP_ORIGIN}/${locale}`);
			lines.push(`/${locale}/ → ${slashed.status} ${slashed.location}`);
		}
		console.log(`[lane-d] D-5 root answers: ${lines.join(' | ')}`);
	});
});

test.describe('lane-d · page families the gate does not cover', () => {
	// Not a green: these document that an anonymous visitor is served a document at all. Every route is client-only
	// (`app/[locale]/layout-component.tsx:40-42`), so the served HTML carries neither the page nor a login form —
	// page-gate-browser.spec.ts pins what such a visitor is then shown.
	for (const path of UNGATED_PAGE_FAMILIES) {
		test(`${path} is served to an anonymous visitor — documented, not approved`, async ({ api, mock }) => {
			const answer = await door(api, path);
			console.log(`[lane-d] ungated ${path} → status ${answer.status}, ${answer.body.length} bytes of HTML`);
			expect(
				answer.status,
				`${path} was gated at the door (${answer.status} → ${answer.location}) although PROTECTED_APP_URL_PATHS (constants.tsx:116-133) names no pattern for it`
			).toBe(200);
			// `accept` cannot make a page's client-only body arrive: the route renders behind ClientOnly (ssr: false).
			expect(
				answer.body,
				`${path} now renders its page (or a login form) in the served HTML — the ClientOnly boundary at layout-component.tsx:40-42 moved`
			).not.toMatch(/<form/i);
			const log = await mock.requests();
			expect(log, `serving ${path} to an anonymous visitor asked the mock: ${logLines(log).join(', ')}`).toEqual([]);
		});
	}

	test('/team/join reaches a visitor for a different reason than /team/tasks does — pinned, not approved', async ({ api }) => {
		// Read from proxy.ts:158-165, and it is not the reason this file first gave:
		//
		//     if (!paths.includes('join') && (paths[0] === 'team' || (LANGS.includes(paths[0]) && paths[1] === 'team')))
		//             ^^^^^^^^^^^^^^^^^^^^ the exemption refuses itself for ANY path carrying a `join` segment
		//         return response;
		//
		// so `/team/join` (`app/[locale]/(focus)/team/join/page.tsx`) is *not* swallowed by the `team/` exemption — it
		// goes on through the whole door. It is public anyway for the plainer reason: no pattern in
		// PROTECTED_APP_URL_PATHS (constants.tsx:116-133) names `team` at all, so `protected_path` is false, no CASE
		// fires, and SECTION 3 (`proxy.ts:603-615`, "public paths: allowed through as-is") returns the document.
		// `/team/tasks` gets its 200 from the exemption instead, before any token is looked at — which is why the two
		// answers are the same status reached by two different routes through the same file.
		// The api lane pins `/team/tasks` (suites/api/page-gate.spec.ts:99-107); this is the join page, whose 200 has
		// to be re-checked against the constants list rather than the exemption if either ever changes.
		const join = await door(api, '/team/join');
		const teamTasks = await door(api, '/team/tasks');
		const localized = await door(api, '/ar/team/join');
		console.log(
			`[lane-d] /team/join → ${join.status} ${join.location || '(no Location)'}; /team/tasks → ${teamTasks.status} ${teamTasks.location || '(no Location)'}; /ar/team/join → ${localized.status} ${localized.location || '(no Location)'}`
		);
		expect(join.status, `/team/join was gated at the door after all (${join.status} → ${join.location})`).toBe(200);
		expect(teamTasks.status, `/team/tasks was gated at the door after all (${teamTasks.status})`).toBe(200);
		expect(
			localized.status,
			`/ar/team/join was gated (${localized.status} → ${localized.location}) although no protected pattern names \`team\`, locale-prefixed or not`
		).toBe(200);
	});

	test('/auth/workspace is public to an anonymous visitor but a session is bounced off it, to a locale-less root — pinned, not approved', async ({
		api,
		mock,
		cookies,
		ids
	}) => {
		// Finding D-4, measured by lane-d's first run (4 failed / 77 passed, `E:\Coding\.tmp\lane-d-run1.log`). The
		// asymmetry is the finding, and it is the opposite of what this case first expected:
		//
		//   /auth/workspace      + session → 307  Location http://localhost:3034/   (bounced off its own page, to a root
		//                                             that carries no locale prefix — the D-5 shape, one branch over)
		//   /pt/auth/workspace   + session → 200  served the sign-in document, session intact
		//
		// Why: `sendsSignedInVisitToApp` (core/lib/auth/signed-in-auth-paths.ts:9-15) matches every `/auth/…` except
		// password recovery, but `proxy.ts:443` hands it the RAW `url.pathname`, so `/pt/auth/…` is not an auth page to
		// this branch and the bounce at `:455-469` never fires for a locale-prefixed sign-in page. The locale-aware call
		// exists two lines below (`:448`, `withoutLocalePrefix(url.pathname)`) — for the Board-return branch only. The
		// bounce itself is decided from the cookie alone (`:462` reads expiry locally, no API call), which is what the
		// empty mock log below proves.
		const anonymous = await door(api, '/auth/workspace');
		expect(anonymous.status, `/auth/workspace was gated to an anonymous visitor (${anonymous.status} → ${anonymous.location})`).toBe(200);

		const { header: cookieHeader } = freshSessionCookie(cookies('A'), ids.user, ids.organizationA, 'lane-d-auth-workspace');
		const answers: string[] = [];
		const bareBounce = await door(api, '/auth/workspace', asPage(cookieHeader));
		answers.push(`/auth/workspace → ${bareBounce.status} ${bareBounce.location || '(no Location)'}`);
		expect(bareBounce.status, `/auth/workspace answered ${bareBounce.status} to a session, not the 307 proxy.ts:469 gives it`).toBe(307);
		expect(
			bareBounce.landed,
			`finding D-4: /auth/workspace bounced its session to ${bareBounce.location} — the root it lands on carries no locale prefix`
		).toBe(`${APP_ORIGIN}/`);

		for (const path of ['/pt/auth/workspace', '/ar/auth/workspace']) {
			const answer = await door(api, path, asPage(cookieHeader));
			answers.push(`${path} → ${answer.status} ${answer.location || '(no Location)'}`);
			expect(
				`${answer.status} ${answer.location || '(no Location)'}`,
				`finding D-4b: ${path} answered ${answer.status}${answer.location ? ` → ${answer.location}` : ''}; a locale-prefixed sign-in page is not recognised by proxy.ts:443, so its session must be left on the page`
			).toBe('200 (no Location)');
		}
		console.log(`[lane-d] /auth/workspace with a session: ${answers.join(' | ')}`);

		const log = await mock.requests();
		expect(
			log,
			`the bounce off /auth/workspace consulted this lane's mock, although proxy.ts:462 answers it from the local token read alone: ${logLines(log).join(', ')}`
		).toEqual([]);
	});
});

test.describe('lane-d · Sec-Fetch-Site variants against a protected page', () => {
	const VARIANTS: Array<{ label: string; headers: Record<string, string> }> = [
		{ label: 'no Sec-Fetch-Site at all', headers: {} },
		{ label: 'same-origin', headers: { 'sec-fetch-site': 'same-origin' } },
		{ label: 'same-site', headers: { 'sec-fetch-site': 'same-site' } },
		{ label: 'cross-site', headers: { 'sec-fetch-site': 'cross-site' } }
	];

	// `refuseForeignOrigin` (core/services/server/same-origin-request.ts:16-34, which refuses `cross-site` AND
	// `same-site` at `:18`) is what reads these headers, and proxy.ts
	// imports neither it nor refuseForeignWrite: the page door cannot be origin-guarded today (AUDIT finding 5).
	for (const path of ['/settings/personal', '/chat']) {
		test(`an anonymous visit to ${path} answers the same whichever Sec-Fetch-Site claims`, async ({ api, mock }) => {
			const answers = [];
			for (const variant of VARIANTS) {
				answers.push({ variant: variant.label, answer: await door(api, path, { anonymous: true, maxRedirects: 0, headers: variant.headers }) });
			}
			const reference = answers[0].answer;
			for (const entry of answers) {
				expect(
					`${entry.answer.status} ${entry.answer.landed}`,
					`Sec-Fetch-Site: ${entry.variant} changed the answer for ${path} (${entry.answer.status} ${entry.answer.landed}) compared with no header (${reference.status} ${reference.landed})`
				).toBe(`${reference.status} ${reference.landed}`);
			}
			const log = await mock.requests();
			expect(log, `a refused ${path} still reached this lane's mock: ${logLines(log).join(', ')}`).toEqual([]);
		});

		test(`a signed-in visit to ${path} is answered (not refused) under every Sec-Fetch-Site, and no write reached the mock`, async ({
			api,
			mock,
			cookies,
			ids
		}) => {
			const { header: cookieHeader, token } = freshSessionCookie(
				cookies('A'),
				ids.user,
				ids.organizationA,
				`lane-d-secfetch-${path}`
			);
			const answers: Array<{ variant: string; answer: Awaited<ReturnType<typeof door>> }> = [];
			for (const variant of VARIANTS) {
				answers.push({
					variant: variant.label,
					answer: await door(api, path, { maxRedirects: 0, headers: { ...variant.headers, cookie: cookieHeader } })
				});
			}
			console.log(`[lane-d] ${path} signed-in: ${answers.map((entry) => `${entry.variant}=${entry.answer.status}${entry.answer.landed ? `→${entry.answer.landed}` : ''}`).join(' | ')}`);
			const statuses = new Set(answers.map((entry) => entry.answer.status));
			expect(
				statuses.size,
				`Sec-Fetch-Site changed the answer for ${path}: ${answers.map((entry) => `${entry.variant}=${entry.answer.status}`).join(', ')}`
			).toBe(1);
			expect(
				[...statuses][0],
				`${path} answered ${[...statuses][0]} to a present session under some Sec-Fetch-Site value (${answers.map((entry) => `${entry.variant}=${entry.answer.status}${entry.answer.landed ? `→${entry.answer.landed}` : ''}`).join(', ')})`
			).toBe(200);

			const log = await mock.requests();
			const writes = log.filter((request) => !['GET', 'HEAD', 'OPTIONS'].includes(request.method));
			expect(
				writes,
				`a page GET of ${path} caused a write at the mock: ${logLines(writes).join(', ')} (whole log: ${logLines(log).join(', ')})`
			).toEqual([]);
			expect(
				log.some((request) => request.path === '/api/user/me'),
				`no door read reached the mock across the four variants (log: ${logLines(log).join(', ')})`
			).toBe(true);
			// …and it was this case's session the door asked about, under whichever variant answered it.
			expect(
				await receivedTokens('/api/user/me'),
				`the door's read for ${path} carried no bearer matching this case's token (log: ${logLines(log).join(', ')})`
			).toContain(sha256(token));
		});
	}

	test('a page path carries no write handler for any Sec-Fetch-Site value, and no write reaches the mock', async ({ api, mock, cookies, ids }) => {
		// A page.tsx exports a component, not a verb handler; and `refuseForeignWrite`
		// (same-origin-request.ts:43-46, the GET/HEAD exemption AUDIT finding 5 pins) is consulted by route handlers
		// only — a page path reaches none of it.
		//
		// Measured by lane-d's first run (`E:\Coding\.tmp\lane-d-run1.log`), and it sharpened the claim twice:
		//   POST /settings/personal → **200** under all four Sec-Fetch-Site variants (no header, same-origin, same-site,
		//   cross-site) — Next answers a POST to a page path with the page document itself, and `origin:` + a broken
		//   JSON body changed nothing; and the mock's log held exactly **4 × `GET /api/user/me` 200**, one per variant,
		//   with **no write** in it. So the invariant that survives is "no write reaches the mock", while the door's
		//   own session read runs on a POST too: CASE 2 (`proxy.ts:523-546`) tests `protected_path && access_token`,
		//   never the method. The mock is authentication-blind (AUDIT 13), so what this pins is that the door *asked*,
		//   four times, on a verb no page handler exists for.
		// Cost note for the next runner: this is the slowest case in the file — in the cold first run it consumed the
		// 180 s test budget because each POST compiled the route again. Warm, it is a handful of seconds.
		const { header: cookieHeader, token } = freshSessionCookie(
			cookies('A'),
			ids.user,
			ids.organizationA,
			'lane-d-page-post'
		);
		const statuses: string[] = [];
		for (const variant of VARIANTS) {
			const response = await api('/settings/personal', {
				method: 'POST',
				// A body that must arrive as broken bytes is a Buffer (README): not the point here, but the rule holds.
				body: Buffer.from('{"anything": '),
				headers: {
					...variant.headers,
					cookie: cookieHeader,
					'content-type': 'application/json',
					origin: APP_ORIGIN
				},
				maxRedirects: 0
			});
			statuses.push(`${variant.label || 'no header'}=${response.status()}`);
		}
		console.log(`[lane-d] POST /settings/personal: ${statuses.join(' | ')}`);
		expect(
			statuses.every((entry) => entry.endsWith('=200')),
			`POST /settings/personal answered ${statuses.join(' | ')}; every variant is measured at 200 — a page path answers a POST with its own document`
		).toBe(true);

		const log = await mock.requests();
		const writes = log.filter((request) => !['GET', 'HEAD', 'OPTIONS'].includes(request.method));
		expect(
			writes,
			`a POST to a page path caused a write at this lane's mock: ${logLines(writes).join(', ')} (whole log: ${logLines(log).join(', ')})`
		).toEqual([]);
		// The door read on a POST is the finding, not noise: one per variant, each carrying this case's token.
		const reads = log.filter((request) => request.path === '/api/user/me');
		expect(
			reads.length,
			`the door did not run its session read on the POST for every variant (${logLines(log).join(', ')}) — proxy.ts:523-546 gates on the path and the token, not the method`
		).toBe(VARIANTS.length);
		expect(
			await receivedTokens('/api/user/me'),
			`the door's POST reads carried no bearer matching this case's token (log: ${logLines(log).join(', ')})`
		).toContain(sha256(token));
	});
});
