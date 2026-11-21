import { expect, test, type StubRequest } from '../../api-fixtures';
import { APP_ORIGIN } from '../../helpers';

/**
 * `x-forwarded-host` decides what the origin guard compares against. This suite is the route-level test AUDIT.md finding 4
 * says does not exist.
 *
 * `core/services/server/same-origin-request.ts:20-32`: when an `Origin` is present, the guard compares its host against
 *
 * ```ts
 * (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host).split(',')[0].trim()
 * ```
 *
 * so the header a proxy sets **outranks the Host the request actually arrived at**, and only its first entry is read. This
 * suite has run twice against lane-c, reusing that lane's own warm app and mock: run 1
 * (`E:\Coding\.tmp\api-forwarded-host-lane-c.log`, 14 discovered, `10 passed (9.5s)`, 4 failed — all four were this
 * file's mistake, described below, not the app's) and run 2
 * (`E:\Coding\.tmp\api-forwarded-host-lane-c-2.log`, 16 discovered, **`16 passed (4.4s)`, 0 failed**).
 *
 * **A — measured, answered yes.** "this app's own `Origin` with `x-forwarded-host` naming another host" is refused on both
 * routes (`… › predicted reverse: this app's own Origin with a forwarded host naming another host is refused`, ok on
 * `/api/issue-types` and `/api/auth/switch-organization`). Without the header reaching `req.headers`, that request's
 * `Origin` and its `Host` are the same host and it would have been forwarded. So a client-supplied `x-forwarded-host`
 * reaches the handler in this app's dev server, and casing does not matter (`same-origin-request.test.ts:42-46` already
 * pinned `X-Forwarded-Host`).
 *
 * **B — the question was wrong, and the run said so.** I wrote "a foreign `Origin` plus this app's host in the header" as
 * the hole. A comparison is not an assignment: the guard refuses when `originHost !== host`, and that request has
 * `some-other-site.example !== localhost:3033`, so it is **refused** — measured, 403 with this app's own body and an empty
 * mock log, on both routes. A header cannot launder a foreign `Origin` into a local one. The request that does match is
 * the one where the caller names **its own** host in the header, which is the point of finding 4 restated correctly: *the
 * right-hand side of the guard's comparison is a value the caller supplies*. Both matching shapes were then run, and both
 * went through on **both** routes (run 2: `… › the comparison the caller can supply …` ok at 37 ms and 33 ms, `… › the same
 * list read the other way round …` ok at 33 ms and 27 ms), each pinned further by an assertion that the route then
 * actually asked the test backend about the path — so this is not "the guard answered null and something else refused",
 * the write was forwarded with the caller's session attached.
 *
 * What this suite can and cannot say: it decides what the **handler** concludes from the header. Whether a caller can
 * deliver one to a real deployment depends on what sits in front of the app (`AUDIT.md` finding 4 says exactly that, and
 * it is not testable here), and a browser would never produce the combination forged below — Chromium sends
 * `Sec-Fetch-Site: cross-site` for a cross-site request, which the guard refuses at `:17-18` before it ever reads an
 * `Origin`. The combination below is what a **non-browser client** (curl, a script, another service) or a **misconfigured
 * proxy** can produce, which is also why finding 4 matters without any attacker: the same line turns this app's own
 * honest writes into 403s when the proxy in front of it sets the header to something other than the public host.
 *
 * `sec-fetch-site` is pinned to `same-origin` (or `none` where the case wants no Origin at all) on every call here, so the
 * first branch of the guard cannot be what answered and a 403 must have come from the Origin comparison.
 *
 * Two layers can answer, and they are told apart by the body, not the status: this app's guard
 * (`{statusCode:403,message:'Cross-site request refused'}`) and the mock backend, which hard-answers 403 to a browser
 * Origin outside its trusted loopback origins (`cypress/support/mock-gauzy-server.mjs`, `TRUSTED_BROWSER_ORIGINS`; see the
 * header note in `playwright/test-servers.ts`). A 403 whose body is not the guard's own text was answered downstream.
 *
 * Routes are picked from the manifest this suite already drives, and only ones whose guard runs **before anything is
 * asked of the API**: `POST /api/issue-types` calls `refuseForeignOrigin` as its first statement
 * (`app/api/issue-types/route.ts:19-21`) and only then `authenticatedGuard` and `createIssueTypeRequest`;
 * `POST /api/auth/switch-organization` is `forwardToGauzy`, which runs the same guard internally
 * (`core/services/server/forward-to-gauzy.ts`). Proving a guard fooled is only meaningful on a route that has one.
 *
 * **Ran, and four of its predictions were wrong.** The ten that held were already pins; the four that failed were this
 * file reading a comparison as an assignment, and they are rewritten from what the run answered rather than quietly
 * relaxed. Nothing in this file is now an unrun prediction — but every number quoted here is from the two lane-c logs
 * named above, and a red after a rebase means the guard changed, which is what the assertions are for.
 */

const FOREIGN_ORIGIN = 'https://some-other-site.example';
const OWN_ORIGIN = APP_ORIGIN;
const OWN_HOST = new URL(OWN_ORIGIN).host;
/** Neither this app's host nor the foreign Origin's: what the guard compares against when the header names it. */
const UNRELATED_HOST = 'forwarded-host-probe.example';

const PROBE_ROUTES = [
	{ path: '/api/issue-types', body: { name: 'Playwright forwarded-host probe' } },
	{ path: '/api/auth/switch-organization', body: { organizationId: 'playwright-forwarded-host-probe' } }
];

const triple = (request: { method: string; path: string; status: number }) => `${request.method} ${request.path} ${request.status}`;
const logOf = (requests: Array<{ method: string; path: string; status: number }>) => requests.map(triple).join(', ');

function parseAnswer(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return { unparsed: text.slice(0, 200) };
	}
}

/** This app's own cross-site refusal, body pinned (`same-origin-request.ts:48-53`). */
function expectRefusedHere(why: string, status: number, text: string) {
	expect(status, `${why}: answered ${status} ${text.slice(0, 200)}`).toBe(403);
	expect(
		parseAnswer(text),
		`${why}: 403, but not this app's own cross-site refusal — the answer was ${text.slice(0, 200)}, which means something downstream of the guard answered`
	).toMatchObject({ statusCode: 403, message: 'Cross-site request refused' });
}

/**
 * "This app's guard did not answer": the write got past `refuseForeignOrigin`, whatever happened after it.
 *
 * Two honest outcomes for such a write: the mock backend was asked (the route proxied it), or the route's own session
 * guard stopped it — `authenticatedGuard` answers `{error:'Unauthorized'}` (`app/api/issue-types/route.ts:24-25`) without
 * asking the API anything. An unexplained 500, or this app's own cross-site refusal, is what this assertion catches.
 */
function expectPastTheGuard(why: string, status: number, text: string, asked: StubRequest[], wholeLog: StubRequest[]) {
	const forwarded = asked.length > 0;
	expect(
		forwarded || /Unauthorized/.test(text),
		`${why}: expected the write to get past refuseForeignOrigin — either the test backend was asked or the route's own session guard answered "Unauthorized" — but the answer was ${status} ${text.slice(0, 200)}, this route in the mock log: ${
			logOf(asked) || 'nothing'
		}, whole mock log: ${logOf(wholeLog) || 'empty'}`
	).toBe(true);
}

for (const route of PROBE_ROUTES) {
	test.describe(`api · x-forwarded-host against ${route.path}`, () => {
		test("control: this app's own Origin, no forwarded host — not refused as cross-site", async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: OWN_ORIGIN, 'sec-fetch-site': 'same-origin' }
			});
			const text = await response.text();
			const asked = await mock.calls(route.path);
			expectPastTheGuard(`own Origin (${OWN_ORIGIN}), no x-forwarded-host, ${route.path}`, response.status(), text, asked, await mock.requests());
		});

		test('control: a foreign Origin with an honest Host is refused here', async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'same-origin' }
			});
			expectRefusedHere(`foreign Origin (${FOREIGN_ORIGIN}), no x-forwarded-host, ${route.path}`, response.status(), await response.text());

			const asked = await mock.calls(route.path);
			expect(
				asked.map(triple),
				`the refusal must come before anything is asked of the API about ${route.path}; the mock recorded ${logOf(asked)} (whole log: ${logOf(await mock.requests())})`
			).toEqual([]);
		});

		test('a foreign Origin whose forwarded host names this app is refused — the header cannot launder an Origin', async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'same-origin', 'x-forwarded-host': OWN_HOST }
			});

			/**
			 * Measured (lane-c, `E:\Coding\.tmp\api-forwarded-host-lane-c.log`: this case and the comma-list case below
			 * were the only 4 reds of a 10-passed run, answered `403 {"statusCode":403,"message":"Cross-site request
			 * refused"}` with the mock log empty). This was **first written as the opposite** — I read `:22` as "the header
			 * becomes the caller's host", which is not what a comparison does. The guard refuses when
			 * `originHost !== host`; naming this app's host in the header while the `Origin` is another one makes them
			 * **differ**, so it is refused. The header does not turn a foreign Origin into a local one. What the header
			 * does is hand the caller the right hand of the comparison: the case that matches is the one below, where the
			 * caller names its *own* host.
			 */
			expectRefusedHere(`foreign Origin + x-forwarded-host: ${OWN_HOST}, ${route.path}`, response.status(), await response.text());
			expect(await mock.calls(route.path), `${route.path} reached the test backend despite the refusal (whole log: ${logOf(await mock.requests())})`).toEqual([]);
		});

		test("the comparison the caller can supply: a foreign Origin whose forwarded host names that same foreign host", async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'same-origin', 'x-forwarded-host': new URL(FOREIGN_ORIGIN).host }
			});
			const text = await response.text();
			const asked = await mock.calls(route.path);

			/**
			 * The shape `same-origin-request.ts:22` actually allows, now that the comparison is read correctly: the host it
			 * compares against is `x-forwarded-host` when that header is present, and a caller may send any value it likes
			 * into it (`same-origin-request.test.ts:42-46` already pins that casing does not matter). Set it to the
			 * caller's own host and `originHost !== host` is false — the guard answers null, and the route proceeds with
			 * the session this test's client attached.
			 *
			 * What this does and does not show. It shows the guard's decision is made from a value the caller supplies, so
			 * for a caller that can set headers (a script, a service, a proxy chain that trusts a client's
			 * `x-forwarded-host`) the Origin check is not a check on the caller at all. It does **not** show a browser
			 * being talked into it: a cross-site browser fetch carries `Sec-Fetch-Site: cross-site`, which `:17-18`
			 * refuses before the Origin is read, and it carries the victim's cookies only if the deployment sets the
			 * cookies `SameSite=None`. Whether a real deployment's front proxy lets a client-supplied
			 * `x-forwarded-host` through is `AUDIT.md` finding 4's open half, and it is not answerable in a lane.
			 */
			expectPastTheGuard(
				`foreign Origin + x-forwarded-host: ${new URL(FOREIGN_ORIGIN).host} (the Origin's own host), ${route.path}`,
				response.status(),
				text,
				asked,
				await mock.requests()
			);
			/** The strong form, pinned because the run answered it: the route really did ask the test backend, so the
			 * guard's null was not followed by some other refusal. */
			expect(
				asked.map(triple),
				`the guard let this write past but the route never asked the test backend about ${route.path} (answered ${response.status()} ${text.slice(0, 200)}; whole log: ${logOf(await mock.requests()) || 'empty'})`
			).not.toEqual([]);
		});

		test('predicted: the same header naming an unrelated host keeps the refusal', async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'same-origin', 'x-forwarded-host': UNRELATED_HOST }
			});
			/**
			 * This one cannot decide anything on its own — a foreign Origin is refused with or without the header — and it
			 * is kept for that reason: it is the control that shows the *other* cases' 403s are the guard's own body and
			 * not something the header caused.
			 */
			expectRefusedHere(`foreign Origin + x-forwarded-host: ${UNRELATED_HOST}, ${route.path}`, response.status(), await response.text());
			expect(await mock.calls(route.path), `${route.path} reached the API despite the refusal (whole log: ${logOf(await mock.requests())})`).toEqual([]);
		});

		test('the same list read the other way round: hosts[0] decides, so the caller puts its own host first', async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'same-origin', 'x-forwarded-host': `${new URL(FOREIGN_ORIGIN).host}, ${OWN_HOST}` }
			});
			const text = await response.text();
			const asked = await mock.calls(route.path);

			/**
			 * `.split(',')[0].trim()` (`same-origin-request.ts:23-24`): only the first entry is compared, so the list an
			 * honest proxy would carry (`public.example, internal-lb.example`) is judged by its first hop alone. Named the
			 * other way round — this app's host first, the caller's after — the run measured it **refused** (the `Origin`
			 * still named the foreign host and hosts[0] named this app), which is why this case is the caller's host first.
			 */
			expectPastTheGuard(
				`x-forwarded-host: "${new URL(FOREIGN_ORIGIN).host}, ${OWN_HOST}" against ${route.path} (hosts[0] is the caller's own host, so the two sides of the comparison match)`,
				response.status(),
				text,
				asked,
				await mock.requests()
			);
			expect(
				asked.map(triple),
				`hosts[0] matched the Origin but ${route.path} was never asked of the test backend (answered ${response.status()} ${text.slice(0, 200)}; whole log: ${logOf(await mock.requests()) || 'empty'})`
			).not.toEqual([]);
		});

		test("predicted reverse: this app's own Origin with a forwarded host naming another host is refused", async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: OWN_ORIGIN, 'sec-fetch-site': 'same-origin', 'x-forwarded-host': UNRELATED_HOST }
			});

			/**
			 * The honest write from this app's own page becomes a cross-site refusal once the header names another host —
			 * the same line as the hole above, seen from the other side. This is why finding 4 is worth closing even with no
			 * attacker in mind: a deployment behind a proxy that sets `x-forwarded-host` to anything other than the public
			 * host answers its own writes with 403.
			 *
			 * If this is green (not refused), the header did not reach `req.headers` at all — and so the case above proved
			 * nothing either. Say so in the report; do not report the hole as closed.
			 */
			expectRefusedHere(
				`own Origin + x-forwarded-host: ${UNRELATED_HOST}, ${route.path} (predicted: the guard reads the header, hosts differ, refused)`,
				response.status(),
				await response.text()
			);
			expect(await mock.calls(route.path), `${route.path} reached the API despite the refusal (whole log: ${logOf(await mock.requests())})`).toEqual([]);
		});

		test('no Origin at all is outside this guard entirely, whatever the forwarded host says', async ({ api, mock }) => {
			/**
			 * `same-origin-request.ts:20-21`: the host comparison runs only `if (origin)`. A write with no `Origin` — curl, a
			 * non-browser client, a client the browser declines to attribute — passes this guard, and no value of
			 * `x-forwarded-host` changes that, so this case does not depend on the header question above.
			 *
			 * Pinned because the audit's *other* guard does refuse exactly this caller: `isTrustedBoardOrigin`
			 * (`core/lib/board/board-app.ts:81-87`) treats a missing Origin as untrusted, while `refuseForeignOrigin` does
			 * not. A reader of finding 1 should be able to see the difference measured instead of inferring it from two
			 * files.
			 */
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { 'sec-fetch-site': 'none', 'x-forwarded-host': UNRELATED_HOST }
			});
			const text = await response.text();
			expect(
				parseAnswer(text),
				`a write with no Origin was refused by this app's guard (answered ${response.status()} ${text.slice(0, 200)}) — same-origin-request.ts:21 runs the host comparison only when an Origin is present, so this cannot be a cross-site refusal`
			).not.toMatchObject({ statusCode: 403, message: 'Cross-site request refused' });
		});
	});
}
