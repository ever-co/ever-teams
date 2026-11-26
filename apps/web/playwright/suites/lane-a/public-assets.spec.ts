import { request as httpRequest } from 'node:http';

import { expect, test } from '../../api-fixtures';
import { APP_ORIGIN, receivedTokens } from '../../helpers';
import type { MockControl } from '../../fixtures';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, triple, triples } from '../api/log-helpers';

/**
 * `apps/web/app/api/public-assets/[...path]/route.ts` — 45 lines, read in full before this file was written.
 *
 * The route's own header (lines 7-17) makes two claims, and every test below pins one of them with a number rather
 * than restating it:
 *
 *   "serves them from the origin the /api routes already proxy to"  — the upstream is `GAUZY_API_SERVER_ORIGIN`
 *     (`constants.tsx:225`, = `basePath`, resolved once at module load at `:214` by `resolveGauzyApiServerBase()`
 *     at `:194-213`, which ranks `GAUZY_API_SERVER_URL` first and falls back to `https://api.ever.team` at `:212`).
 *     Pinned by the lane mock's request log: an icon request writes `GET /public/ever-icons/task-statuses/open.svg`
 *     into *this lane's* mock (`test-servers.ts:285-290` points a lane app at its own mock), which is only possible
 *     if that origin was the one fetched. Every refusal below writes nothing at all, so a positive entry cannot be
 *     an artifact.
 *
 *   "every path segment must be a plain file name, so no request can point this at another host or escape
 *     `<origin>/public/`" — the three guards at `route.ts:30-37` (`SAFE_SEGMENT` `:20`, `MAX_SEGMENTS` `:23`,
 *     `SAFE_EXTENSION` `:22`) and `proxyGauzyImage`'s own `^https?://` check (`proxy-gauzy-image.ts:16`). One test
 *     per shape, each recording whether the mock was asked at all.
 *
 * **The discriminator this file runs on.** Two different 404s come back and they are not the same 404:
 *
 *   - the route's own `notFound()` (`route.ts:25`) is `new NextResponse(null, { status: 404 })`: **0 bytes, no
 *     `content-type`, no `cache-control`**. A request that reaches the handler and is refused, or forwarded and then
 *     rejected by the content-type gate, answers that.
 *   - Next's not-found page is **20 296–20 324 bytes of `text/html` with `Cache-Control: no-store`**. A request the
 *     router never handed to this handler answers that (`/api/public-assets` with no segments at all, and
 *     `%2e%2e/ever-icons/...` whose decoded `..` Next resolves to `/api/ever-icons/...`).
 *   - Next's own redirect layer answers a third way: **308 + a `location`** for a path it rewrites before routing
 *     (`..`, `.`, `//`, a trailing slash).
 *
 * So "the route refused it" and "the route never saw it" and "Next rewrote it" are three measurable states, and the
 * mock's request log separates the first two.
 *
 * **Why some requests here go through `node:http` and not the `api` fixture.** A WHATWG URL parser (which
 * Playwright's request context uses) removes `.` and `..` segments from the path before the request is written, so
 * `..` never reaches the server as `..`. `rawWire()` writes the path to the socket exactly as spelled — that is the
 * only way to measure what the app does with a raw dot-segment rather than what a client does with it. Percent
 * escapes are *not* decoded by that parser, so `%2e%2e`, `%2F` and `%5C` go through the normal fixture.
 *
 * **What this lane cannot measure, stated up front rather than discovered later.**
 * - The 200 pass-through branch (`proxy-gauzy-image.ts:29-40`: status, `Content-Type`, `Cache-Control`,
 *   `X-Content-Type-Options: nosniff`, and the CSP from `route.ts:43`) is unreachable here. The lane mock answers
 *   *every* path it was not written for with `pagination([])` at `cypress/support/mock-gauzy-server.mjs:806`, and
 *   writes `content-type: application/json` for every answer it gives (`:1109`); `proxy-gauzy-image.ts:27` turns a
 *   non-`image/*` answer into the 404. So the strongest statement the lane can make about the happy path is about
 *   the *call* the route made, not the body it would have streamed. Every "200" quoted below is the status the mock
 *   answered the *route* with; the status the *browser* gets from this route is 404.
 * - Request headers the route sends upstream are invisible: the mock's log "stays body/header free" by design
 *   (`mock-gauzy-server.mjs:1080`) and only a `Bearer` is recorded separately (`:1094-1100`, as a sha256). So
 *   `Accept: image/*` (`proxy-gauzy-image.ts:21`) is asserted nowhere, and "no credential was forwarded" is proved
 *   for the one credential the mock can see.
 */

const ROUTE = '/api/public-assets';
/** The shape Gauzy stores for a task status icon (`public-asset-url.ts:5`, `icon-items.tsx:105`). */
const ICON = 'ever-icons/task-statuses/open.svg';
/** What that icon becomes on the wire at the upstream: `publicAssetUrl(ICON, GAUZY_API_SERVER_ORIGIN)`, `:62`. */
const UPSTREAM_ICON = `/public/${ICON}`;

type Answer = { status: number; bytes: number; body: string; headers: Record<string, string> };

async function readAnswer(response: {
	status(): number;
	text(): Promise<string>;
	headers(): Record<string, string>;
}): Promise<Answer> {
	const body = await response.text();
	return { status: response.status(), bytes: Buffer.byteLength(body), body, headers: response.headers() };
}

/** The answer written to the socket, with no URL parser in the way. */
function rawWire(path: string, method = 'GET', headers: Record<string, string> = {}): Promise<Answer> {
	const target = new URL(APP_ORIGIN);
	return new Promise((resolve, reject) => {
		const request = httpRequest(
			{ hostname: target.hostname, port: target.port, path, method, headers: { accept: '*/*', ...headers } },
			(response) => {
				let body = '';
				response.setEncoding('utf8');
				response.on('data', (chunk: string) => {
					body += chunk;
				});
				response.on('end', () => {
					const flat: Record<string, string> = {};
					for (const [name, value] of Object.entries(response.headers)) {
						flat[name] = Array.isArray(value) ? value.join(', ') : String(value);
					}
					resolve({ status: response.statusCode ?? 0, bytes: Buffer.byteLength(body), body, headers: flat });
				});
			}
		);
		request.on('error', reject);
		request.end();
	});
}

/** `NextResponse(null, { status: 404 })` as the wire sees it: nothing to hash, no type, no directive. */
const isBodiless404 = (answer: Answer): boolean =>
	answer.status === 404 && answer.bytes === 0 && !answer.headers['content-type'] && !answer.headers['cache-control'];

const describeAnswer = (answer: Answer): string =>
	`${answer.status} ${answer.bytes} bytes content-type=${JSON.stringify(answer.headers['content-type'] ?? null)} ` +
	`cache-control=${JSON.stringify(answer.headers['cache-control'] ?? null)} ` +
	`etag=${JSON.stringify(answer.headers['etag'] ?? null)} set-cookie=${JSON.stringify(answer.headers['set-cookie'] ?? null)}`;

test.describe('lane-a · /api/public-assets streams from the origin this app already proxies to', () => {
	test('a plain icon path is served by asking this lane’s mock for the public file, and for nothing else', async ({
		api,
		mock
	}) => {
		const answer = await readAnswer(await api(`${ROUTE}/${ICON}`, { anonymous: true }));
		const asked = await mock.requests();

		// The proof of the first sentence of the route's header. This log belongs to the mock on this lane's own port
		// (`test-servers.ts:38`, `LANE_PORTS['lane-a']`), so the entry can only have been written by a fetch that went
		// to `http://127.0.0.1:3992`; a route still falling back to `https://api.ever.team` (`constants.tsx:212`)
		// would leave it empty.
		expect(
			triples(asked),
			`${ROUTE}/${ICON}: expected exactly one upstream call for the public file; whole log ${logOf(asked)}`
		).toEqual([`GET ${UPSTREAM_ICON} 200`]);
		// Never an `/api/...` call: Gauzy publishes these files next to the API, not under it
		// (`public-asset-url.ts:5-6`, `constants.tsx:222-224`).
		expect(
			asked.some((request) => request.path.startsWith('/api/')),
			`${ROUTE}/${ICON}: the route asked an /api path (${logOf(asked)}) — this route must fetch <origin>/public/`
		).toBe(false);

		// The route's own answer, pinned as measured. It is 404 only because the mock cannot answer `image/*`
		// (`mock-gauzy-server.mjs:806`, `:1109`) and `proxy-gauzy-image.ts:27` refuses a non-image answer; see the
		// file header.
		expect(answer.status, `${ROUTE}/${ICON} answered ${describeAnswer(answer)}`).toBe(404);
		expect(answer.bytes, `${ROUTE}/${ICON} answered ${describeAnswer(answer)} — the 404 carries no body`).toBe(0);
	});

	test('the ask carries no credential and no query string', async ({ api, mock }) => {
		const answer = await readAnswer(await api(`${ROUTE}/${ICON}?x=1&y=%2e%2e`, { anonymous: true }));
		const asked = await mock.requests();

		expect(
			asked.map((request) => `${request.method} ${request.path} ${request.query} ${request.status}`),
			`${ROUTE}/${ICON}?x=1: expected the upstream path with an empty query; whole log ${logOf(asked)}`
		).toEqual([`GET ${UPSTREAM_ICON}  200`]);

		// The one credential this mock records is a `Bearer` (`mock-gauzy-server.mjs:1094-1100`, sha256 only). Empty
		// means none arrived. The route could not have sent one: `proxy-gauzy-image.ts:21` fetches with
		// `{ headers: { Accept: accept } }` and nothing else.
		const tokens = await receivedTokens(UPSTREAM_ICON);
		expect(
			tokens,
			`the lane mock recorded Bearer tokens on ${UPSTREAM_ICON} (${JSON.stringify(
				tokens
			)}) — this route is unauthenticated by design (route.ts:16)`
		).toEqual([]);
		test.info().annotations.push({
			type: 'not observable on a lane',
			description:
				'the mock request log is body- and header-free by design (cypress/support/mock-gauzy-server.mjs:1080), so `Accept: image/*` (proxy-gauzy-image.ts:21) and any Cookie header the route might have forwarded cannot be read out of the log; the Bearer half above is the one credential the mock will report'
		});
		expect(answer.status, `a query-string variant answered ${describeAnswer(answer)}`).toBe(404);
	});

	test('an upstream that answers 200 with JSON is answered 404 with an empty body, not passed through', async ({
		api,
		mock
	}) => {
		// The upstream really did answer 200 — visible in the log below — so this is the content-type gate at
		// `proxy-gauzy-image.ts:27` (`!response?.ok || !contentType.startsWith('image/')`), not a failed call.
		const answer = await readAnswer(await api(`${ROUTE}/${ICON}`, { anonymous: true }));
		const asked = await mock.requests();
		expect(triples(asked), `the gate needs an answered upstream call; whole log ${logOf(asked)}`).toEqual([
			`GET ${UPSTREAM_ICON} 200`
		]);
		expect(
			isBodiless404(answer),
			`a 200 JSON upstream answered ${describeAnswer(answer)} — expected the route's own bodiless 404`
		).toBe(true);
	});

	test('an upstream that dies mid-request is answered the same way, and the log is what tells them apart', async ({
		api,
		mock
	}) => {
		await mock.scenario({ drops: { [UPSTREAM_ICON]: 1 } });
		const answer = await readAnswer(await api(`${ROUTE}/${ICON}`, { anonymous: true }));
		const asked = await mock.requests();

		// `status: 0` is what the mock writes for a call it cut off (`mock-gauzy-server.mjs:1089`), and it is the only
		// thing separating "the fetch threw" (`proxy-gauzy-image.ts:21-24` → 404) from the refusal above.
		expect(
			asked.map((request) => `${request.method} ${request.path} ${request.status}`),
			`a dropped upstream expected one call answered 0; whole log ${logOf(asked)}`
		).toEqual([`GET ${UPSTREAM_ICON} 0`]);
		expect(
			isBodiless404(answer),
			`an unreachable upstream answered ${describeAnswer(answer)} — the caller's 404 must not become a 500`
		).toBe(true);
	});
});

test.describe('lane-a · a path segment is a file name or the request is refused before anything is asked', () => {
	/** The refusal, plus the half only the log can prove: the refusal happened *here*, upstream was never asked. */
	const expectRefusedWithoutAsking = async (label: string, mock: MockControl) => {
		const asked = await mock.requests();
		expect(
			asked.filter((request) => request.path.startsWith('/public/')).map(triple),
			`${label}: a refusal that still asked upstream (${logOf(asked)}) would point this route at a path the guards refused`
		).toEqual([]);
		expect(asked.map(triple), `${label}: the whole lane log must be empty; it holds ${logOf(asked)}`).toEqual([]);
	};

	test('.. is rewritten by Next into /api and never reaches this route', async ({ mock }) => {
		const answer = await rawWire(`${ROUTE}/..`);
		expect(
			answer.headers['location'],
			`a raw .. answered ${answer.status} with location ${JSON.stringify(answer.headers['location'])}`
		).toBe('/api');
		expect(
			answer.status,
			`a raw .. answered ${describeAnswer(answer)} — Next's own redirect layer answered it`
		).toBe(308);
		await expectRefusedWithoutAsking('raw ..', mock);
	});

	test('a single dot segment is rewritten too, so an empty-segment request is never this route’s to answer', async ({
		api,
		mock
	}) => {
		const rewritten = await rawWire(`${ROUTE}/.`);
		expect(
			rewritten.headers['location'],
			`a raw . answered ${rewritten.status} location=${JSON.stringify(rewritten.headers['location'])}`
		).toBe(ROUTE);
		const encoded = await rawWire(`${ROUTE}/%2e`);
		expect(
			encoded.headers['location'],
			`an encoded %2e answered ${encoded.status} location=${JSON.stringify(encoded.headers['location'])}`
		).toBe(ROUTE);

		// The follow-on answer for a client that obeys the redirect: the zero-segment path is not matched by
		// `[...path]` at all, so `route.ts:31`'s `segments.length === 0` guard is not the layer that answers it.
		const followed = await readAnswer(await api(ROUTE, { anonymous: true }));
		expect(
			followed.headers['content-type'] ?? '',
			`GET ${ROUTE} with no segments answered ${describeAnswer(followed)} — Next's not-found page answers, not the route's 404`
		).toContain('text/html');
		expect(followed.headers['cache-control'], `GET ${ROUTE} answered ${describeAnswer(followed)}`).toBe('no-store');
		await expectRefusedWithoutAsking('the empty-segment family', mock);
	});

	test('a trailing slash and a double slash are collapsed by a 308 before the handler runs', async ({ mock }) => {
		const trailing = await rawWire(`${ROUTE}/${ICON}/`);
		expect(trailing.status, `a trailing slash answered ${describeAnswer(trailing)}`).toBe(308);
		expect(
			trailing.headers['location'],
			`a trailing slash answered ${trailing.status} location=${JSON.stringify(trailing.headers['location'])}`
		).toBe(`${ROUTE}/${ICON}`);

		const doubled = await rawWire(`${ROUTE}/ever-icons//task-statuses//open.svg`);
		expect(doubled.status, `a double slash answered ${describeAnswer(doubled)}`).toBe(308);
		expect(
			doubled.headers['location'],
			`a double slash answered ${doubled.status} location=${JSON.stringify(doubled.headers['location'])}`
		).toBe(`${ROUTE}/${ICON}`);
		await expectRefusedWithoutAsking('the slash-collapse family', mock);
	});

	test('…but a client that follows that 308 is served the collapsed path, so the collapse decides which file is asked for', async ({
		api,
		mock
	}) => {
		const kept = await api('/api/public-assets/ever-icons//task-statuses//open.svg', {
			anonymous: true,
			maxRedirects: 0
		});
		const keptAnswer = await readAnswer(kept);
		expect(keptAnswer.status, `the un-followed double slash answered ${describeAnswer(keptAnswer)}`).toBe(308);

		const followed = await readAnswer(
			await api('/api/public-assets/ever-icons//task-statuses//open.svg', { anonymous: true })
		);
		const asked = await mock.requests();
		expect(
			triples(asked),
			`the followed double slash expected one upstream call for the collapsed file; whole log ${logOf(asked)}`
		).toEqual([`GET ${UPSTREAM_ICON} 200`]);
		expect(followed.status, `the followed double slash answered ${describeAnswer(followed)}`).toBe(404);
	});

	test('..%2F (an encoded slash after a dot) is refused here and asked nowhere', async ({ api, mock }) => {
		const answer = await readAnswer(
			await api(`${ROUTE}/..%2Fever-icons%2Ftask-statuses%2Fopen.svg`, { anonymous: true })
		);
		expect(
			isBodiless404(answer),
			`..%%2F answered ${describeAnswer(answer)} — expected this route's own bodiless 404, not Next's HTML 404`
		).toBe(true);
		await expectRefusedWithoutAsking('..%2F', mock);
	});

	test('%2e%2e in front of the file name is answered by Next, not by this route', async ({ api, mock }) => {
		const answer = await readAnswer(await api(`${ROUTE}/%2e%2e/${ICON}`, { anonymous: true }));
		// Next decodes `%2e%2e` to `..` and resolves it *before* routing, so the request never names this handler; the
		// 20 KB HTML body is what that looks like. Distinct from the `%2E%2E%2F` (encoded slash) case below.
		expect(answer.status, `%2e%2e/${ICON} answered ${describeAnswer(answer)}`).toBe(404);
		expect(
			answer.headers['content-type'] ?? '',
			`%2e%2e/${ICON} answered ${describeAnswer(answer)} — Next's not-found page, not the route's empty 404`
		).toContain('text/html');
		expect(
			answer.bytes,
			`%2e%2e/${ICON} body was ${answer.bytes} bytes; the not-found page is ~20 KB`
		).toBeGreaterThan(1000);
		expect(answer.headers['cache-control'], `%2e%2e/${ICON} answered ${describeAnswer(answer)}`).toBe('no-store');
		await expectRefusedWithoutAsking('%2e%2e with a following path', mock);
	});

	test('an encoded slash inside a segment is refused, including a whole traversal spelled in escapes', async ({
		api,
		mock
	}) => {
		const inside = await readAnswer(
			await api(`${ROUTE}/ever-icons%2Ftask-statuses%2Fopen.svg`, { anonymous: true })
		);
		expect(isBodiless404(inside), `a segment holding %2F answered ${describeAnswer(inside)}`).toBe(true);
		await expectRefusedWithoutAsking('%2F inside a segment', mock);

		const traversal = await readAnswer(await api(`${ROUTE}/%2E%2E%2Fetc/passwd.png`, { anonymous: true }));
		expect(isBodiless404(traversal), `%2E%2E%2Fetc/passwd.png answered ${describeAnswer(traversal)}`).toBe(true);
		await expectRefusedWithoutAsking('%2E%2E%2F traversal', mock);

		const nested = await readAnswer(await api(`${ROUTE}/ever-icons/..%2Fopen.svg`, { anonymous: true }));
		expect(isBodiless404(nested), `ever-icons/..%2Fopen.svg answered ${describeAnswer(nested)}`).toBe(true);
		await expectRefusedWithoutAsking('..%2F under a real directory', mock);
	});

	test('a segment that is an absolute URL is refused, even though the helper it feeds would have honoured it', async ({
		api,
		mock
	}) => {
		// `public-asset-url.ts:58` returns any value matching `HAS_SCHEME` (`:30`) untouched — which is right for the
		// API's own `fullIconUrl`, and would be a redirect-to-any-host if a request could reach it. The guard at
		// `route.ts:33` (`SAFE_SEGMENT` allows no `:` and no `/`) refuses it before `publicAssetUrl` is called at `:39`.
		const answer = await readAnswer(
			await api(`${ROUTE}/https%3A%2F%2Fexample.invalid%2Fx.png`, { anonymous: true })
		);
		expect(isBodiless404(answer), `an absolute-URL segment answered ${describeAnswer(answer)}`).toBe(true);
		await expectRefusedWithoutAsking('absolute-URL segment', mock);

		const schemeOnly = await readAnswer(
			await api(`${ROUTE}/https:%2F%2Fexample.invalid%2Fx.png`, { anonymous: true })
		);
		expect(
			isBodiless404(schemeOnly),
			`an unescaped colon in a segment answered ${describeAnswer(schemeOnly)}`
		).toBe(true);
		await expectRefusedWithoutAsking('absolute-URL segment with a raw colon', mock);
	});

	test('a dotfile name is refused by the same rule that refuses . and ..', async ({ api, mock }) => {
		const answer = await readAnswer(await api(`${ROUTE}/.hidden.png`, { anonymous: true }));
		expect(isBodiless404(answer), `.hidden.png answered ${describeAnswer(answer)}`).toBe(true);
		await expectRefusedWithoutAsking('.hidden.png', mock);

		const backslash = await readAnswer(await api(`${ROUTE}/a%5Cb.png`, { anonymous: true }));
		expect(
			isBodiless404(backslash),
			`a segment holding %5C (backslash) answered ${describeAnswer(backslash)}`
		).toBe(true);
		await expectRefusedWithoutAsking('a..b.png and a backslash segment', mock);
	});

	test('only the last segment needs an extension, and only these six are accepted', async ({ api, mock }) => {
		const noExtension = await readAnswer(await api(`${ROUTE}/open`, { anonymous: true }));
		expect(isBodiless404(noExtension), `a path with no extension answered ${describeAnswer(noExtension)}`).toBe(
			true
		);
		await expectRefusedWithoutAsking('no extension', mock);

		const wrongExtension = await readAnswer(await api(`${ROUTE}/open.txt`, { anonymous: true }));
		expect(isBodiless404(wrongExtension), `open.txt answered ${describeAnswer(wrongExtension)}`).toBe(true);
		await expectRefusedWithoutAsking('open.txt', mock);

		// `SAFE_EXTENSION` (`route.ts:22`) is anchored at the end, so `.svgz` is not `.svg`.
		const closeExtension = await readAnswer(await api(`${ROUTE}/open.svgz`, { anonymous: true }));
		expect(isBodiless404(closeExtension), `open.svgz answered ${describeAnswer(closeExtension)}`).toBe(true);
		await expectRefusedWithoutAsking('open.svgz', mock);

		const nestedWrong = await readAnswer(await api(`${ROUTE}/open.tar.gz`, { anonymous: true }));
		expect(isBodiless404(nestedWrong), `open.tar.gz answered ${describeAnswer(nestedWrong)}`).toBe(true);
		await expectRefusedWithoutAsking('open.tar.gz', mock);
	});

	test('eight segments are forwarded and nine are refused, which is MAX_SEGMENTS = 8 read off the wire', async ({
		api,
		mock
	}) => {
		const eight = await readAnswer(await api(`${ROUTE}/s1/s2/s3/s4/s5/s6/s7/open.svg`, { anonymous: true }));
		const eightAsked = await mock.requests();
		expect(
			triples(eightAsked),
			`eight segments were expected to reach the upstream; whole log ${logOf(eightAsked)}`
		).toEqual(['GET /public/s1/s2/s3/s4/s5/s6/s7/open.svg 200']);
		expect(eight.status, `eight segments answered ${describeAnswer(eight)}`).toBe(404);

		const nineAnswer = await readAnswer(
			await api(`${ROUTE}/s1/s2/s3/s4/s5/s6/s7/s8/open.svg`, { anonymous: true })
		);
		expect(isBodiless404(nineAnswer), `nine segments answered ${describeAnswer(nineAnswer)}`).toBe(true);
		// Only the nine-segment ask is being judged here; the eight-segment ask above is already accounted for.
		const nineOnly = (await mock.requests()).filter((request) => request.path.includes('/public/s8'));
		expect(
			nineOnly.map(triple),
			`nine segments reached upstream (${logOf(nineOnly)}) — MAX_SEGMENTS is 8 (route.ts:23, :32)`
		).toEqual([]);
	});

	test('a segment holding .. inside a name is a file name, not a traversal', async ({ api, mock }) => {
		// `SAFE_SEGMENT` (`route.ts:20`) rejects a *leading* dot only; `a..b.png` is an ordinary file name and is
		// forwarded verbatim as `<origin>/public/a..b.png`. Pinned because the header's promise is about segments, and
		// this is the boundary of that promise.
		const answer = await readAnswer(await api(`${ROUTE}/a..b.png`, { anonymous: true }));
		const asked = await mock.requests();
		expect(
			triples(asked),
			`a..b.png: expected the name forwarded as one segment; whole log ${logOf(asked)}`
		).toEqual(['GET /public/a..b.png 200']);
		expect(answer.status, `a..b.png answered ${describeAnswer(answer)}`).toBe(404);
	});

	test('a 4 004-character segment is forwarded: nothing in this route bounds a name’s length', async ({
		api,
		mock
	}) => {
		const longName = 'a'.repeat(4000) + '.png';
		const longPath = '/public/' + longName;
		const answer = await readAnswer(await api(`${ROUTE}/${longName}`, { anonymous: true }));
		const asked = await mock.requests();
		expect(
			asked.map((request) => `${request.method} ${request.path.length} chars ${request.status}`),
			`a 4 004-char segment: expected the full name upstream; whole log ${logOf(asked)}`
		).toEqual([`GET ${longPath.length} chars 200`]);
		expect(answer.status, `a 4 004-char segment answered ${describeAnswer(answer)}`).toBe(404);
		test.info().annotations.push({
			type: 'finding',
			description:
				'the only bound this route puts on a path is MAX_SEGMENTS = 8 (route.ts:23, :32); a single 4 004-character segment is forwarded to <origin>/public/ untouched. The route header (route.ts:14-15) promises "a plain file name", which the segment rule enforces as a shape, not as a length'
		});
	});

	test('an uppercase extension is accepted and forwarded exactly as spelled', async ({ api, mock }) => {
		const answer = await readAnswer(await api(`${ROUTE}/open.SVG`, { anonymous: true }));
		expect(
			triples(await mock.requests()),
			'open.SVG: expected the name forwarded with its case intact; whole log ' + logOf(await mock.requests())
		).toEqual(['GET /public/open.SVG 200']);
		expect(answer.status, `open.SVG answered ${describeAnswer(answer)}`).toBe(404);
	});
});

test.describe('lane-a · the verbs this route answers, and the ones it does not', () => {
	const expected: Array<{ method: string; status: number; upstreamAsked: boolean; note: string }> = [
		{ method: 'GET', status: 404, upstreamAsked: true, note: 'the only handler exported (route.ts:27)' },
		{
			method: 'HEAD',
			status: 404,
			upstreamAsked: true,
			note: 'Next hands HEAD to the GET handler, and the upstream call is a full GET: the route exports no HEAD (route.ts)'
		},
		{
			method: 'OPTIONS',
			status: 204,
			upstreamAsked: false,
			note: 'answered by Next, which reports allow: GET, HEAD, OPTIONS'
		},
		{ method: 'POST', status: 405, upstreamAsked: false, note: 'no POST export' },
		{ method: 'PUT', status: 405, upstreamAsked: false, note: 'no PUT export' },
		{ method: 'DELETE', status: 405, upstreamAsked: false, note: 'no DELETE export' }
	];

	for (const verb of expected) {
		test(`${verb.method} on an icon path answers ${verb.status}, and ${verb.upstreamAsked ? 'asks' : 'does not ask'} upstream`, async ({
			api,
			mock
		}) => {
			const wantsBody = verb.method === 'POST' || verb.method === 'PUT';
			const answer = await readAnswer(
				await api(`${ROUTE}/${ICON}`, {
					method: verb.method,
					anonymous: true,
					...(wantsBody ? { body: { path: ICON } } : {})
				})
			);
			const asked = await mock.requests();

			expect(
				answer.status,
				`${verb.method} ${ROUTE}/${ICON} answered ${describeAnswer(answer)} (${verb.note})`
			).toBe(verb.status);
			expect(
				answer.bytes,
				`${verb.method} ${ROUTE}/${ICON} answered ${describeAnswer(answer)} — expected no body`
			).toBe(0);
			expect(
				verb.upstreamAsked ? triples(asked) : asked.map(triple),
				`${verb.method} ${ROUTE}/${ICON}: expected ${
					verb.upstreamAsked ? `exactly one GET ${UPSTREAM_ICON}` : 'no upstream call at all'
				}; whole log ${logOf(asked)}`
			).toEqual(verb.upstreamAsked ? [`GET ${UPSTREAM_ICON} 200`] : []);

			if (verb.method === 'HEAD') {
				// The upstream call is logged as a GET even though the client asked for HEAD: this route never fetches
				// a bodiless upstream response, it fetches the whole file and then throws it away.
				expect(
					asked.map((request) => request.method),
					`HEAD ${ROUTE}/${ICON}: the upstream call was ${logOf(asked)} — the route exports only GET`
				).toEqual(['GET']);
			}
			if (verb.method === 'OPTIONS') {
				expect(
					answer.headers['allow'] ?? '',
					`OPTIONS answered ${describeAnswer(answer)} with allow=${JSON.stringify(answer.headers['allow'])}`
				).toBe('GET, HEAD, OPTIONS');
			}
			if (verb.status === 405) {
				// The 405 names no `allow`, unlike the OPTIONS answer above: nothing on this route tells a client which
				// verbs it has. Matches what suites/lane-c/method-and-preflight.spec.ts recorded for other routes.
				expect(
					answer.headers['allow'],
					`${verb.method} ${ROUTE}/${ICON} answered 405 with allow=${JSON.stringify(answer.headers['allow'])}`
				).toBeUndefined();
			}
		});
	}
});

test.describe('lane-a · a session changes nothing, because this route is unauthenticated exactly like the direct URL', () => {
	test('the same icon through an anonymous request and through the lane session answers identically', async ({
		api,
		mock
	}) => {
		const anonymous = await readAnswer(await api(`${ROUTE}/${ICON}`, { anonymous: true }));
		const anonymousAsked = await mock.requests();

		const session = await readAnswer(await api(`${ROUTE}/${ICON}`, { scope: 'A' }));
		const asked = await mock.requests();
		// The log holds both halves: everything after the anonymous half's own entries belongs to the session request.
		const sessionAsked = asked.slice(anonymousAsked.length);

		// `anonymous.*` and `session.*` are measured from two different requests, so this compares them rather than
		// restating one.
		expect(
			`${session.status}/${session.bytes}/${session.headers['content-type'] ?? 'none'}`,
			`anonymous ${describeAnswer(anonymous)} versus a session request ${describeAnswer(session)} — the two answers must not differ`
		).toBe(`${anonymous.status}/${anonymous.bytes}/${anonymous.headers['content-type'] ?? 'none'}`);
		expect(
			sessionAsked.map(triple),
			`the session request expected the same single upstream call as the anonymous one; whole log ${logOf(asked)}`
		).toEqual([`GET ${UPSTREAM_ICON} 200`]);
		expect(anonymousAsked.length, `the anonymous half asked ${logOf(anonymousAsked)}`).toBe(1);

		// No `Bearer` reached the mock for either half. The lane session carries an `auth-token` cookie
		// (`helpers.ts:150-167`), and `proxy-gauzy-image.ts:21` sends only `Accept`, so a session must leave no
		// credential at the upstream.
		expect(
			await receivedTokens(UPSTREAM_ICON),
			`the mock recorded Bearer tokens on ${UPSTREAM_ICON}: ${JSON.stringify(await receivedTokens(UPSTREAM_ICON))}`
		).toEqual([]);
	});

	test('a session that is refused is refused the same way, and a session is never the reason a refusal calls upstream', async ({
		api,
		mock
	}) => {
		const answer = await readAnswer(
			await api(`${ROUTE}/..%2Fever-icons%2Ftask-statuses%2Fopen.svg`, { scope: 'A' })
		);
		expect(isBodiless404(answer), `a session request with ..%2F answered ${describeAnswer(answer)}`).toBe(true);
		const asked = await mock.requests();
		expect(asked.map(triple), `a session request with ..%2F asked ${logOf(asked)}; expected nothing`).toEqual([]);
		test.info().annotations.push({
			type: 'not observable on a lane',
			description:
				'the mock logs no Cookie header (cypress/support/mock-gauzy-server.mjs:1080 keeps the log header-free), so "the browser’s cookies were not forwarded" is proved here only for the Bearer the mock does record (:1094-1100) and by the absence of any call at all'
		});
	});
});

test.describe('lane-a · the shape of these answers', () => {
	test('the route’s 404 has no body, no content-type, no cache directive, no etag and sets no cookie', async ({
		api
	}) => {
		const refusal = await readAnswer(await api(`${ROUTE}/.hidden.png`, { anonymous: true }));
		const forwardedThenRefused = await readAnswer(await api(`${ROUTE}/${ICON}`, { anonymous: true }));

		for (const [label, answer] of [
			['a refusal', refusal],
			['a forwarded non-image', forwardedThenRefused]
		] as const) {
			expect(
				isBodiless404(answer),
				`${label} answered ${describeAnswer(answer)} — NextResponse(null, { status: 404 }) at route.ts:25 writes nothing`
			).toBe(true);
			expect(
				answer.headers['etag'],
				`${label} carried etag=${JSON.stringify(answer.headers['etag'])} — nothing here is cache-validated`
			).toBeUndefined();
			expect(
				answer.headers['set-cookie'],
				`${label} carried set-cookie=${JSON.stringify(answer.headers['set-cookie'])}`
			).toBeUndefined();
		}
	});

	test('the two 404s this route can produce are different objects, and the byte counts say which layer answered', async ({
		api
	}) => {
		const byRoute = await readAnswer(await api(`${ROUTE}/open.txt`, { anonymous: true }));
		const byRouter = await readAnswer(await api(`${ROUTE}/%2e%2e/${ICON}`, { anonymous: true }));
		const noRouteAtAll = await readAnswer(await api(ROUTE, { anonymous: true }));

		expect(
			[byRoute.bytes, byRouter.bytes, noRouteAtAll.bytes].join(' / '),
			`byte counts expected: the route's own 404 empty, the not-found page ~20 KB (${byRoute.bytes} / ${byRouter.bytes} / ${noRouteAtAll.bytes})`
		).toMatch(/^0 \/ \d{5} \/ \d{5}$/);
		expect(byRouter.headers['cache-control'], `the not-found page answered ${describeAnswer(byRouter)}`).toBe(
			'no-store'
		);
		expect(
			byRoute.headers['cache-control'],
			`the route's own 404 answered ${describeAnswer(byRoute)} — it carries no directive`
		).toBeUndefined();
	});

	test('a refusal is not a redirect, and no answer in this family is a 3xx with a Location pointing outside this app', async ({
		api
	}) => {
		const paths = [
			`${ROUTE}/..%2F${ICON}`,
			`${ROUTE}/https%3A%2F%2Fexample.invalid%2Fx.png`,
			`${ROUTE}/.hidden.png`,
			`${ROUTE}/open.svgz`
		];
		for (const path of paths) {
			const answer = await readAnswer(await api(path, { anonymous: true, maxRedirects: 0 }));
			expect(answer.status, `${path} answered ${describeAnswer(answer)} — a refusal must not be a redirect`).toBe(
				404
			);
			expect(
				answer.headers['location'],
				`${path} carried location=${JSON.stringify(answer.headers['location'])}`
			).toBeUndefined();
		}
	});
});

test.describe('lane-a · the same icon through the app, and through the URL a browser would be handed', () => {
	test('the page tells the browser this lane’s API origin, which is the origin the route fetches from', async ({
		api
	}) => {
		const page = await readAnswer(
			await api('/auth/passcode', { anonymous: true, headers: { accept: 'text/html' } })
		);
		const index = page.body.indexOf('NEXT_PUBLIC_GAUZY_API_SERVER_URL');
		expect(
			index,
			`the served document (${page.bytes} bytes) names no NEXT_PUBLIC_GAUZY_API_SERVER_URL at all`
		).toBeGreaterThan(-1);
		const declared = page.body
			.slice(index, index + 120)
			.match(/NEXT_PUBLIC_GAUZY_API_SERVER_URL&quot;:&quot;([^&"]+)/)?.[1];
		expect(
			declared ?? null,
			`the runtime-env attribute of the ${page.bytes}-byte document holds ${JSON.stringify(
				page.body.slice(index, index + 120)
			)} — expected it to name ${MOCK_ORIGIN}`
		).toBe(MOCK_ORIGIN);
	});

	test('the direct URL answers this mock’s JSON catch-all; the route answers its own 404 for the same file', async ({
		api,
		mock
	}) => {
		// The two URLs a caller of `publicAssetUrl` can be given for one icon:
		//   `<origin>/public/<path>`  (public-asset-url.ts:62 with an origin, as `icon-items.tsx:107` and
		//     `edit-status-modal.tsx:53` build it from the published public origin) — measured straight from the mock;
		//   `/api/public-assets/<path>` (public-asset-url.ts:62 with no origin, which is exactly what
		//     `property-icon-image.tsx:30` passes: `publicAssetUrl(text, '')`) — measured through the route.
		const direct = await readAnswer(await api(`${MOCK_ORIGIN}/public/${ICON}`, { anonymous: true }));
		const directAsked = await mock.requests();
		expect(
			directAsked.map(triple),
			`the direct URL expected the mock to answer its unmatched-path payload; whole log ${logOf(directAsked)}`
		).toEqual([`GET ${UPSTREAM_ICON} 200`]);
		expect(direct.status, `the direct URL answered ${describeAnswer(direct)} (${direct.body.slice(0, 60)})`).toBe(
			200
		);
		expect(direct.headers['content-type'] ?? '', `the direct URL answered ${describeAnswer(direct)}`).toContain(
			'application/json'
		);
		expect(direct.headers['cache-control'], `the direct URL answered ${describeAnswer(direct)}`).toBe('no-store');
		// The mock's unmatched-path payload, `pagination([])` at mock-gauzy-server.mjs:806, is the whole body.
		expect(
			`${direct.bytes} ${direct.body}`,
			`the direct URL answered ${direct.status} with ${describeAnswer(direct)}`
		).toBe('22 {"items":[],"total":0}');

		const throughTheRoute = await readAnswer(await api(`${ROUTE}/${ICON}`, { anonymous: true }));
		expect(throughTheRoute.status, `the route answered ${describeAnswer(throughTheRoute)}`).toBe(404);
		expect(
			throughTheRoute.bytes,
			`the route answered ${describeAnswer(throughTheRoute)} — it streams nothing here`
		).toBe(0);
		expect(
			throughTheRoute.headers['cache-control'],
			`the route answered ${describeAnswer(throughTheRoute)} — the upstream's no-store is not inherited by a refusal`
		).toBeUndefined();
	});

	test('the route server-side never asks for an /api path, and the browser half of that pair is the public path itself', async ({
		api,
		mock
	}) => {
		const answer = await readAnswer(await api(`${ROUTE}/task-sizes/large.svg`, { anonymous: true }));
		const asked = await mock.requests();
		expect(asked.map(triple), `task-sizes/large.svg: expected one public read; whole log ${logOf(asked)}`).toEqual([
			'GET /public/task-sizes/large.svg 200'
		]);
		expect(
			asked.some((request) => request.path.startsWith('/api/')),
			`the route asked ${logOf(asked)} — GAUZY_API_SERVER_ORIGIN (constants.tsx:225) has no /api in it, unlike GAUZY_API_SERVER_URL (:227)`
		).toBe(false);
		expect(answer.status, `task-sizes/large.svg answered ${describeAnswer(answer)}`).toBe(404);
	});
});
