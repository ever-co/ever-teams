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
 * so the header a proxy sets **outranks the Host the request actually arrived at**, and only its first entry is read.
 * Nothing in `playwright/` or `cypress/` has ever sent that header (`grep -rn "x-forwarded-host" playwright cypress` →
 * `same-origin-request.ts:22` and its unit test `core/services/server/same-origin-request.test.ts:37`), so a run has never
 * answered either of these:
 *
 *   A. Does a client-supplied `x-forwarded-host` reach `req.headers` in the `next dev` server this suite runs against?
 *   B. If it does, does a foreign `Origin` become "this app's own host" by naming the app's host there?
 *
 * **The cases are written as a pair, because the pair answers A whether or not B is true.** "a foreign Origin + the app's
 * own host in the header" (predicted forwarded) and "this app's own Origin + an unrelated host in the header" (predicted
 * refused) both pass when the header is honoured, and both fail when it is stripped — while the control with an unrelated
 * header and a foreign Origin fails in neither world, because a foreign Origin alone is already refused. Read the two
 * together before concluding anything about the guard.
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
 * **Every expectation in this file is predicted from the source, and this file has never been run.** A red is the run
 * telling us the prediction was wrong: read the readings written into the failure message — and the paired case beside it
 * — before changing any assertion.
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

		test("predicted hole: a foreign Origin plus x-forwarded-host naming this app's own host gets past the guard", async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'same-origin', 'x-forwarded-host': OWN_HOST }
			});
			const text = await response.text();
			const asked = await mock.calls(route.path);

			/**
			 * Predicted from `same-origin-request.ts:22`: the guard compares `some-other-site.example` against the header's
			 * `localhost:3030` … they match … the write is forwarded with the caller's session cookies.
			 *
			 * If this is red, the paired case below says which world we are in: red **with that one also red** means the
			 * header never reached `req.headers` in this dev server (question A) — nothing was fooled. Red **while that one
			 * is green** means the header arrived but the guard no longer prefers it — re-read `same-origin-request.ts:22`
			 * before touching this file. A 403 whose body is not this app's refusal is neither: it came from the mock's own
			 * Origin gate.
			 */
			expectPastTheGuard(
				`foreign Origin + x-forwarded-host: ${OWN_HOST}, ${route.path} (predicted: the guard reads the header, hosts match, the write is forwarded)`,
				response.status(),
				text,
				asked,
				await mock.requests()
			);
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

		test("predicted: a comma list is read as hosts[0], so this app's host first is what forwards it", async ({ api, mock }) => {
			const response = await api(route.path, {
				method: 'POST',
				body: route.body,
				headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'same-origin', 'x-forwarded-host': `${OWN_HOST}, ${UNRELATED_HOST}` }
			});
			const text = await response.text();
			const asked = await mock.calls(route.path);

			/**
			 * `.split(',')[0].trim()` (`same-origin-request.ts:23-24`): the first entry decides. The list an honest proxy
			 * appends to (`public.example, internal-lb.example`) is therefore judged by its first hop, and a caller that can
			 * name the public host first is treated as coming from it.
			 */
			expectPastTheGuard(
				`x-forwarded-host: "${OWN_HOST}, ${UNRELATED_HOST}" against ${route.path} (predicted: hosts[0] = ${OWN_HOST} = the Origin's host, so forwarded)`,
				response.status(),
				text,
				asked,
				await mock.requests()
			);
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
