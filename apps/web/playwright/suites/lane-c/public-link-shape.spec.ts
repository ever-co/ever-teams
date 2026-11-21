import { expect, test, type ApiCall } from '../../api-fixtures';

/**
 * The `/api/public/*` routes answer without a session, on a link that lives in the URL. Nothing in this
 * app compares that link to anything: what the handlers do is check its *shape* and then forward it, and
 * the platform decides whether the link is real. So the thing these routes can be proved to do is refuse a
 * link that is not shaped like a link, before any request leaves this app.
 *
 * `core/lib/utils/shared-invoice.ts` `isSharedInvoiceLink` (invoice id must be a UUID, the token must be
 * three `A-Za-z0-9_-` parts) and `saved-report-proxy.ts` / `public/team` (no empty segment, no `.`/`..`)
 * are the whole local defense. A well-formed but wrong token is not a refusal here, and none of these
 * routes rate-limits or locks, so a wrong token cannot be told apart from a missing link by brute force —
 * that is recorded in PLAN.md rather than asserted as a defect of the handler.
 *
 * **Corrected against a run, 2026-11-21**: `Running 19 tests using 1 worker` / `19 passed (9.9s)`, log kept at
 * `artifacts/lane-c-public-link-shape-3.log` (18 discovered before the two segment tests were split, 19 after).
 * The invoice half behaves exactly as written above: seven malformed links answered 400 `Invalid link` with the mock
 * asked nothing. The *segment* half does not: a dot segment (`.`, `..`, `%2e`, `%2e%2e`, and an empty segment) is
 * removed or unmatched **by the URL layer, before this app routes anything**, so those probes get Next's own 404
 * `text/html` and never a `400 Invalid link` from `saved-report-proxy.ts:139` or `app/api/public/team/.../route.ts:17`.
 * Those two guards are reachable only from a URL that is already inside a single segment — and the form that does get
 * there (`..%2F`, `..%2F..%2Fuser%2Fme`, `a%2Fb%2Fc`) is not refused at all: it is forwarded, re-encoded into one
 * segment by the request builders, and answered 200. So the defence these routes actually have against a walking id is
 * the re-encoding, not the shape check; the two tests that pinned "refused before it is asked" now pin the recorded
 * paths instead, and `PLAN.md` records it as a finding.
 */

const UUID = '2f8a4b6c-9d3e-4c8a-a7f1-0b5d6e4f3a2c';
const GOOD_TOKEN = 'aaaa-bbbb.cccc-dddd.eeee1111';

/** Everything a `/api/public/*` answer must say about caching: nothing here may be cached. */
function expectNotCacheable(headers: Record<string, string>, why: string) {
	const cacheControl = headers['cache-control'] ?? '';
	expect(
		cacheControl,
		`${why}: answered with a cache-control of "${cacheControl}" — a shared link's payload must not be cacheable`
	).toContain('no-store');
}

async function call(api: ApiCall, path: string, options: Parameters<ApiCall>[1] = {}) {
	const response = await api(path, { anonymous: true, ...options });
	const text = await response.text();
	return { status: response.status(), text, headers: response.headers(), why: `${options.method ?? 'GET'} ${path}` };
}

test.describe('a shared link that is not shaped like a link is refused here', () => {
	const BAD_INVOICE_LINKS: Array<[string, string]> = [
		['an id that is not a uuid', `/api/public/invoice/not-a-uuid/${GOOD_TOKEN}`],
		['an id that is a hex string', `/api/public/invoice/deadbeef/${GOOD_TOKEN}`],
		['an empty id', `/api/public/invoice/x/${GOOD_TOKEN}`],
		['a token of two parts instead of three', `/api/public/invoice/${UUID}/aaaa.bbbb`],
		['a token with a slash in it', `/api/public/invoice/${UUID}/aaa%2Fbbb.ccc.ddd`],
		['a token with a dot-segment', `/api/public/invoice/${UUID}/aaa...bbb.ccc`],
		['a long id', `/api/public/invoice/${'u'.repeat(300)}/${GOOD_TOKEN}`]
	];

	for (const [what, path] of BAD_INVOICE_LINKS) {
		test(`GET ${path} — ${what}`, async ({ api, mock }) => {
			const { status, text, headers, why } = await call(api, path);

			expect(status, `${why}: a malformed shared invoice link answered ${status} ${text}`).toBe(400);
			expect(text, `${why}: the refusal did not say the link is invalid`).toContain('Invalid link');
			expectNotCacheable(headers, why);
			expect(
				(await mock.requests()).map((request) => `${request.method} ${request.path}`),
				`${why}: the API was asked about a link this app refused`
			).toEqual([]);
		});
	}

	test('a shared invoice link that is well shaped is forwarded untouched, token and all', async ({ api, mock }) => {
		const { status, text, headers } = await call(api, `/api/public/invoice/${UUID}/${GOOD_TOKEN}`);

		expect(status, `the shared invoice read answered ${status} ${text}`).toBe(200);
		expectNotCacheable(headers, `GET /api/public/invoice/${UUID}/${GOOD_TOKEN}`);

		const asked = await mock.calls('/api/public/invoice/');
		expect(asked.map((call) => `${call.method} ${call.path}`), `the link did not reach the API: ${JSON.stringify(await mock.requests())}`).toEqual([
			`GET /api/public/invoice/${UUID}/${GOOD_TOKEN}`
		]);
		expect(asked[0].query, `the relations the route names did not travel: ${asked[0].query}`).toContain('relations=');
	});

	test('the invoice download forwards the same link to its own path', async ({ api, mock }) => {
		const { status, text } = await call(api, `/api/public/invoice/${UUID}/${GOOD_TOKEN}/download`);

		expect(status, `the invoice download answered ${status} ${text}`).toBe(200);
		expect(
			(await mock.calls('/api/public/invoice/')).map((call) => call.path),
			`the download was not forwarded as its own path: ${JSON.stringify(await mock.requests())}`
		).toEqual([`/api/public/invoice/${UUID}/${GOOD_TOKEN}/download`]);
	});

	test('a malformed invoice-payments link is refused the same way', async ({ api, mock }) => {
		const { status, text, headers } = await call(api, `/api/public/invoice-payments/invoice/not-a-uuid/${GOOD_TOKEN}`);

		expect(status, `a malformed payment link answered ${status} ${text}`).toBe(400);
		expect(text, `the payment-link refusal did not say the link is invalid`).toContain('Invalid link');
		expectNotCacheable(headers, 'GET the malformed payment link');
		expect(await mock.requests(), 'the API was asked about a payment link this app refused').toEqual([]);
	});

	/**
	 * A dot-segment never reaches this app. Measured 2026-11-21 in a lane-c run (`18 passed (3.4s)`), against
	 * `app/api/public/saved-reports/[token]/route.ts` and its handler `proxyReadSharedReport`
	 * (`core/services/server/saved-report-proxy.ts:138-139`, which refuses an empty token and a `.`/`..` token with a
	 * 400 `Invalid link`): a URL path segment that *is* a dot segment — `.`, `..`, `%2e`, `%2e%2e` (WHATWG treats the
	 * percent forms as dot segments and removes them while parsing) — is gone before Next routes anything, so what a
	 * caller gets is **Next's own 404 `text/html` not-found page** and the mock is asked nothing. `saved-report-proxy.ts`'s
	 * 400 is real code that a fetched URL cannot reach on this route; the file says so rather than crediting it.
	 *
	 * The form that *does* reach the handler is a slash an encoder left in one segment (`..%2F`, `a%2Fb%2Fc`): not a dot
	 * segment, so it survives parsing, is not `.` or `..`, and is handed to the upstream by
	 * `readSharedReportRequest`, which re-encodes it (`core/services/server/requests/saved-reports.ts:95`
	 * `encodeURIComponent(token)`) — so it stays inside `/api/public/saved-reports/` and is answered 200. That is the
	 * honest split this test pins: refused **before the handler by the URL layer**, or forwarded **one segment wide**,
	 * never a walk out of the prefix.
	 */
	const DOT_SEGMENT_PROBES = [
		'/api/public/saved-reports/%2e%2e',
		'/api/public/saved-reports/%2e',
		'/api/public/saved-reports/',
		'/api/public/team/fixture-team/%2e',
		'/api/public/team/fixture-team/..'
	];

	test('a dot-segment token is removed by the URL layer before any handler runs, pinned rather than approved', async ({
		api,
		mock
	}) => {
		for (const path of DOT_SEGMENT_PROBES) {
			const { status, text } = await call(api, path);
			expect(status, `${path}: answered ${status} — expected Next's own 404 for a path whose dot segment the URL parser removed`).toBe(404);
			expect(
				(text.match(/<html|nextjs-portal|not-found/i) ?? []).length,
				`${path}: answered 404 but not with Next's not-found document, so this pin needs re-reading: ${text.slice(0, 200)}`
			).toBeGreaterThan(0);
		}

		// Nothing of this reached the API — and the filtered view names the only prefix it could have reached.
		expect(
			await mock.paths(),
			`a dot-segment probe asked the API something, which the run of 2026-11-21 did not see: ${JSON.stringify(await mock.requests())}`
		).toEqual([]);
	});

	test('a saved-report token that keeps an encoded slash is forwarded as one segment of its own path', async ({ api, mock }) => {
		// `..%2F` and `a%2Fb%2Fc` are not dot segments, so they are routed, pass `isWalkingSegment`, and travel —
		// re-encoded, which is what keeps them inside `/api/public/saved-reports/`. Pinned with the exact paths the
		// mock recorded on 2026-11-21.
		for (const path of ['/api/public/saved-reports/a%2Fb%2Fc', '/api/public/saved-reports/..%2F']) {
			const { status } = await call(api, path);
			expect(status, `${path}: answered ${status}, expected 200 (the upstream is the only thing that saw this token)`).toBe(200);
		}

		expect(
			(await mock.calls('/api/public/saved-reports/')).map((request) => `${request.method} ${request.path} ${request.status}`),
			`a saved-report token left its own path on the way to the API: ${JSON.stringify(await mock.requests())}`
		).toEqual([
			'GET /api/public/saved-reports/a%2Fb%2Fc 200',
			'GET /api/public/saved-reports/..%2F 200'
		]);
	});

	test('a well-formed saved-report link is forwarded as one segment', async ({ api, mock }) => {
		const { status, text, headers } = await call(api, '/api/public/saved-reports/sr-1111-2222-3333');

		expect(status, `the saved-report read answered ${status} ${text}`).toBe(200);
		expectNotCacheable(headers, 'GET /api/public/saved-reports/sr-1111-2222-3333');
		expect(
			(await mock.calls('/api/public/saved-reports/')).map((call) => call.path),
			`the report link did not reach the API: ${JSON.stringify(await mock.requests())}`
		).toEqual(['/api/public/saved-reports/sr-1111-2222-3333']);
	});
});

test.describe('the shared invoice checkout takes only a return address it recognises', () => {
	const RETURN = 'http://localhost:3033/shared-invoice/2f8a4b6c';

	test('a return address outside this app’s shared-invoice page is refused here', async ({ api, mock }) => {
		const { status, text, headers } = await call(api, `/api/public/invoice-payments/invoice/${UUID}/${GOOD_TOKEN}/checkout`, {
			method: 'POST',
			body: { returnUrl: 'https://some-other-site.example/steal' },
			headers: { origin: 'http://localhost:3033' }
		});

		expect(status, `a foreign return address was accepted (${status} ${text})`).toBe(400);
		expect(text, `the refusal did not name the return address as the problem`).toContain('Invalid return address');
		expectNotCacheable(headers, 'POST checkout with a foreign return address');
		expect(await mock.requests(), 'the checkout endpoint was asked about a return address this app refused').toEqual([]);
	});

	test('a return address that is not a URL at all is refused here', async ({ api, mock }) => {
		for (const body of [{ returnUrl: 'not-a-url' }, { returnUrl: '' }, { returnUrl: 'ftp://localhost/shared-invoice' }, {}]) {
			const response = await api(`/api/public/invoice-payments/invoice/${UUID}/${GOOD_TOKEN}/checkout`, {
				method: 'POST',
				body,
				headers: { origin: 'http://localhost:3033' }
			});
			const text = await response.text();
			expect(response.status(), `a checkout with ${JSON.stringify(body)} answered ${response.status()} ${text}`).toBe(400);
		}
		expect(await mock.requests(), 'a refused checkout reached the API anyway').toEqual([]);
	});

	test('this app’s own shared-invoice page is accepted and forwarded', async ({ api, mock }) => {
		const { status, text } = await call(api, `/api/public/invoice-payments/invoice/${UUID}/${GOOD_TOKEN}/checkout`, {
			method: 'POST',
			body: { returnUrl: RETURN },
			headers: { origin: 'http://localhost:3033' }
		});

		expect(status, `a return address this app accepts was refused (${status} ${text})`).toBe(200);
		const asked = await mock.calls('/api/public/invoice-payments/invoice/');
		expect(asked.map((call) => `${call.method} ${call.path}`), `the checkout did not reach the API: ${JSON.stringify(await mock.requests())}`).toEqual([
			`POST /api/public/invoice-payments/invoice/${UUID}/${GOOD_TOKEN}/checkout`
		]);
		// The mock answers a POST by echoing the body it was given, which is how "only returnUrl travelled"
		// is provable at all.
		const forwardedBody = JSON.parse(text) as Record<string, unknown>;
		expect(Object.keys(forwardedBody).sort(), `the app forwarded more than the return address: ${text}`).toEqual(['returnUrl']);
		expect(forwardedBody.returnUrl, `the return address was rewritten on the way: ${text}`).toBe(RETURN);
	});

	test('the return-address origin check only runs when the client reports an origin — pinned, not approved', async ({ api, mock }) => {
		// `isPaymentReturnUrl` compares the address's origin with the `Origin` header *when that header is
		// present*. A client that sends no Origin (anything that is not a browser form post) therefore gets
		// an address of another host accepted, as long as its path is `/shared-invoice`. Pinned so that
		// tightening it — or explaining why it is enough — has to happen in the open.
		const { status, text } = await call(api, `/api/public/invoice-payments/invoice/${UUID}/${GOOD_TOKEN}/checkout`, {
			method: 'POST',
			body: { returnUrl: 'https://some-other-site.example/shared-invoice/ok' }
		});

		expect(status, `a no-Origin checkout with a foreign return address was refused after all (${status} ${text})`).toBe(200);
		expect((await mock.calls('/api/public/invoice-payments/')).length, 'the checkout was not forwarded').toBe(1);
	});
});

test.describe('the public team read', () => {
	test('an encoded walking team id is forwarded verbatim inside its own path — the walk is stopped by re-encoding, not by a refusal', async ({
		api,
		mock
	}) => {
		/**
		 * The predecessor's claim here ("a walking profile link or team id is refused before the team is asked for") is
		 * not what the app does, and the run of 2026-11-21 said so. `app/api/public/team/[profileLink]/[teamId]/route.ts:17`
		 * refuses only a segment that is *exactly* `.` or `..`; `..%2F..%2Fuser%2Fme` decodes to `../../user/me`, is not
		 * that, passes the guard, and is handed on. What stops the walk is the builder
		 * (`core/services/server/requests/public-organization-team.ts:34-38`, whose own comment says it: the two
		 * decoded ids are `encodeURIComponent`-ed back into **one** segment each) — so the id the upstream is asked about
		 * is still a segment of `/api/public/team/`, never a path of its own. Pinned with the exact recorded paths,
		 * because "the id could not leave its prefix" is proved by the log, and "the app refused it" is not true.
		 */
		const probes = [
			'/api/public/team/fixture-team/..%2F..%2Fuser%2Fme',
			'/api/public/team/..%2F..%2F/33333333-3333-4333-8333-111111111111',
			'/api/public/team/..%2F/33333333-3333-4333-8333-111111111111'
		];

		for (const path of probes) {
			const { status } = await call(api, path);
			expect(
				status,
				`${path}: answered ${status}, expected 200 — this route refuses only a segment that is exactly "." or "..", and an encoded slash is neither`
			).toBe(200);
		}

		expect(
			(await mock.calls('/api/public/team/')).map((request) => `${request.method} ${request.path} ${request.status}`),
			`a walking team id left the public team path on the way to the API: ${JSON.stringify(await mock.requests())}`
		).toEqual([
			'GET /api/public/team/fixture-team/..%2F..%2Fuser%2Fme 200',
			'GET /api/public/team/..%2F..%2F/33333333-3333-4333-8333-111111111111 200',
			'GET /api/public/team/..%2F/33333333-3333-4333-8333-111111111111 200'
		]);

		// The half that is a real defence, proved as the absence: no walking id ever became a read of another endpoint
		// (`/api/user/me` is the endpoint the `..%2F..%2Fuser%2Fme` shape was aimed at).
		expect(
			(await mock.requests()).filter((request) => !request.path.startsWith('/api/public/team/')).map((request) => request.path),
			`a walking team id reached an endpoint outside its own prefix: ${JSON.stringify(await mock.requests())}`
		).toEqual([]);
	});

	test('a public team link is forwarded for any team id, and answered with no cache directive — documented, not approved', async ({
		api,
		ids,
		mock
	}) => {
		// The route performs no check of its own: no session, no "is this team public", no "does this profile link
		// belong to this team" (`app/api/public/team/[profileLink]/[teamId]/route.ts` reads the two segments, refuses
		// an empty one and a `.`/`..`, and forwards). `shareProfileView` is a switch the *platform* honours. What is
		// proved here is the two things this app is answerable for: the pair it was given left as it arrived, and the
		// answer it hands the browser carries no caching directive.
		const path = `/api/public/team/fixture-team/${ids.teamB}`;
		const { status, text, headers } = await call(api, path);

		expect(status, `the public team read answered ${status} ${text.slice(0, 200)}`).toBe(200);

		expect(
			(await mock.calls('/api/public/team/')).map((call) => call.path),
			`the public team read did not reach the API with the team the link named: ${JSON.stringify(await mock.requests())}`
		).toEqual([`/api/public/team/fixture-team/${ids.teamB}`]);

		// Pinned as a mock gap, not as a claim about the app: `mock-gauzy-server.mjs` answers
		// `/api/public/team/<link>/<id>` with *its own* fixture team (`{ ...data.team }`, line 582), whichever id the
		// path names. So "the bytes that came back are team B's" cannot be decided against this mock — what can be
		// decided is that the id was forwarded, above, and that the answer is a team row at all.
		const body = JSON.parse(text) as Record<string, unknown>;
		expect(
			body.id,
			`the mock stopped answering a public team link with a team row, so this case needs re-reading (PLAN.md, mock gaps): ${text.slice(0, 200)}`
		).toBe(ids.teamA);

		// Pinned as a finding, in the harness's blocker style: `NextResponse.json(response.data)` on this route sets
		// no Cache-Control, so a shared link's team — its members, its tasks and its last worked task — is served to
		// any cache on the way with no directive saying it may not be stored. Remove this assertion, and make the
		// route answer `no-store`, together.
		expect(
			headers['cache-control'] ?? '<no Cache-Control header on this answer>',
			`GET ${path} carried a team's members and tasks with a cache-control of "${headers['cache-control'] ?? ''}" — the route is expected to mark this answer uncacheable, and does not`
		).toBe('<no Cache-Control header on this answer>');
	});
});
