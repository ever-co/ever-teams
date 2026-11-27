import { test, expect } from '../../api-fixtures';
import { mockReset, mockRequests, receivedTokens } from '../../helpers';
import { logOf, parseAnswer } from '../api/log-helpers';
import { mintAccessToken, mintAccessTokenWith, sha256 } from './lane-d-session';

/**
 * Independent re-measurement of lane-b's download statements, half 2: the `z.guid()` shape check on the docs export
 * route, and what the download helper will forward a session token for. Measured against lane-d's own app (3034) and
 * mock (4006); the probes behind these cases are `E:\Coding\.tmp\lane-d-claims-probe-1.txt`. No number here is taken
 * from another lane's log.
 *
 * ## The code these cases measure (each line read out of the file before being named)
 *
 * - `app/api/plugins/docs/documents/[id]/export.pdf/route.ts`: `const documentIdSchema = z.guid()` (`:5`),
 *   `safeParse((await params).id)` (`:12`), the refusal `{ error: 'A document id is required' }` at 400 (`:13`), and
 *   `forwardDownloadToGauzy(req, '/plugins/docs/documents/' + parsed.data + '/export.pdf')` (`:14`) — the accepted
 *   string is put into the upstream path as it stands.
 * - The check itself, `zod@4.6.6` (`node_modules/zod/package.json`): `export const guid =
 *   /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/`
 *   (`node_modules/zod/v4/core/regexes.js:21`, comment at `:20` "any UUID-like identifier: 8-4-4-4-12 hex pattern").
 *   No version nibble and no variant nibble are named there; `zod`'s version-aware form is a different function
 *   (`uuid(version)`, `:25-29`), which this route does not use.
 * - `core/services/server/forward-download-to-gauzy.ts`: cookies (`:36`), `requestAccessToken` (`:37`), tab bearer
 *   (`:39`), `if (!access_token) return …401` (`:40`), then the fetch with `Bearer ${access_token}` (`:47`). The token
 *   string is used as it came from the cookie; nothing in this file reads a claim. With no `Authorization` request
 *   header `tabSessionOf` returns at `core/services/server/tab-session.ts:38` before decoding anything, so the cases
 *   below hand the app a cookie token and nothing else.
 * - `core/services/server/request-cookies.ts`: `requestAccessToken` (`:26-38`) reads `<name>_totalChunks` through
 *   `tokenCookieChunkCount` (`core/lib/helpers/cookies/token-chunks.ts:15-19`, a whole number 1..64 or "no chunked
 *   token"), and returns null when a announced chunk is missing (`:31-33`). Cookie names from
 *   `core/constants/config/constants.tsx:136` (`auth-token`) and `:142` (`auth-tenant-id`); the chunk names a sign-in
 *   writes are `auth-token0`, `auth-token1`, … (`core/lib/helpers/cookies/index.ts:125`).
 * - `cypress/support/mock-gauzy-server.mjs`: the bearer hash list (`:1094-1099`, sha256 of what arrived, never the
 *   token) and the request log (`:1082-1090`) — the only witnesses this lane has of "the platform was asked".
 *
 * `suites/api/tab-session.spec.ts` owns which token is forwarded and the bearer-alone 401; `suites/lane-c/
 * permission-guard.spec.ts` owns the export route's gate. Nothing here repeats those.
 */

const ROUTE_OF = (id: string) => `/api/plugins/docs/documents/${id}/export.pdf`;
const GOOD_ID = '2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d';
const GOOD_FILE = ROUTE_OF(GOOD_ID);

/** A `Cookie:` header with `auth-token` replaced by a token of this case's own claims. */
const withToken = (cookieHeader: string, token: string) =>
	cookieHeader.replace(/auth-token=[^;]+/, `auth-token=${token}`);

/**
 * The same header with its `auth-token` entry replaced by the chunked shape a sign-in writes: `auth-token_totalChunks`
 * plus `auth-token0`, `auth-token1`, … (`core/lib/helpers/cookies/index.ts:125`, and the names
 * `request-cookies.ts:27-35` reads back). Passing fewer chunks than announced is how a case hands the app a session
 * that is missing exactly one of them.
 */
const withChunks = (cookieHeader: string, totalChunks: string, ...chunks: string[]) => {
	const withoutToken = cookieHeader.split('; ').filter((entry) => !entry.startsWith('auth-token='));
	const chunkEntries = chunks.map((chunk, index) => `auth-token${index}=${chunk}`);
	return [...chunkEntries, `auth-token_totalChunks=${totalChunks}`, ...withoutToken].join('; ');
};

/** The app's answer as one line, for every failure message. */
const describeAnswer = (status: number, body: string, headers: Record<string, string>) =>
	`status ${status} · body(${body.length}) ${body.slice(0, 140)} · content-type ${headers['content-type']}`;

const asksFor = (requests: Array<{ method: string; path: string; status: number }>, path: string) =>
	requests
		.filter((request) => request.path === path)
		.map((request) => `${request.method} ${request.path} ${request.status}`);

const REFUSAL = { error: 'A document id is required' };

test.describe('lane-d · re-measuring the download claims: the guid shape check, and the token it forwards', () => {
	test('the shape check accepts a 0-prefixed id, an uppercase id and bad version nibbles, and each reaches the upstream path spelled as it was given', async ({
		api
	}) => {
		const accepted = [
			'0f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d', // 0-prefixed
			'2F7E0B3A-4A53-4A1C-9C0E-8D7B6A5F4E3D', // uppercase throughout
			'2f7e0b3a-4a53-7a1c-9c0e-8d7b6a5f4e3d', // version nibble 7
			'2f7e0b3a-4a53-0a1c-9c0e-8d7b6a5f4e3d' // version nibble 0
		];
		await mockReset();

		for (const id of accepted) {
			const path = ROUTE_OF(id);
			const response = await api(path);
			const body = await response.text();
			const log = await mockRequests();
			const witness = `${id} · ${describeAnswer(response.status(), body, response.headers())}`;

			expect(response.status(), `the shape check refused an id it used to accept: ${witness}`).toBe(200);
			// Verbatim, uppercase included: the accepted string is the path segment the platform was asked for.
			expect(
				asksFor(log, path),
				`the id no longer reaches the upstream path spelled as the caller wrote it: ${witness} · log ${logOf(log)}`
			).toEqual([`GET ${path} 200`]);
		}
	});

	test('the shape check refuses a non-hex version nibble, a 38-character id and a dash-less id, before anything is asked', async ({
		api
	}) => {
		const refused = [
			'2f7e0b3a-4a53-za1c-9c0e-8d7b6a5f4e3d', // `z` is not a hex digit, so the regex itself fails
			'2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d00', // 38 characters
			'2f7e0b3a4a534a1c9c0e8d7b6a5f4e3d' // 32 hex characters, no dashes
		];
		await mockReset();

		for (const id of refused) {
			const response = await api(ROUTE_OF(id));
			const body = await response.text();
			const log = await mockRequests();
			const witness = `${id} · ${describeAnswer(response.status(), body, response.headers())}`;

			expect(response.status(), `an id the shape check used to refuse now passes: ${witness}`).toBe(400);
			expect(parseAnswer(body), `the refusal answer changed: ${witness}`).toEqual(REFUSAL);
			// The route answered before forwardDownloadToGauzy could run: the platform was asked nothing at all.
			expect(log, `a refused id still reached the platform: ${witness} · log ${logOf(log)}`).toEqual([]);
		}
	});

	test('the shape check answers ahead of the session: a bad id with no cookie is a 400, a good id with no cookie is a 401', async ({
		api
	}) => {
		await mockReset();

		const badId = await api(ROUTE_OF('2f7e0b3a-4a53-za1c-9c0e-8d7b6a5f4e3d'), { anonymous: true });
		const badIdBody = await badId.text();
		expect(
			badId.status(),
			`the bearer check answered before the shape check: ${describeAnswer(badId.status(), badIdBody, badId.headers())}`
		).toBe(400);
		expect(parseAnswer(badIdBody), `the anonymous bad-id answer changed: ${badIdBody.slice(0, 160)}`).toEqual(
			REFUSAL
		);

		const noSession = await api(GOOD_FILE, { anonymous: true });
		const noSessionBody = await noSession.text();
		expect(
			noSession.status(),
			`the download helper stopped refusing a session-less call: ${describeAnswer(noSession.status(), noSessionBody, noSession.headers())}`
		).toBe(401);
		expect(
			parseAnswer(noSessionBody),
			`the session refusal answer changed: ${noSessionBody.slice(0, 160)}`
		).toEqual({
			statusCode: 401,
			message: 'Unauthorized'
		});
		// forward-download-to-gauzy.ts:40 answers before its fetch, so neither call reached the platform.
		expect(await mockRequests(), `a refused download reached the platform: ${logOf(await mockRequests())}`).toEqual(
			[]
		);
	});

	test('a percent-encoded ../ reaches the shape check and is refused; a raw ../ or a second segment never reaches the route', async ({
		api
	}) => {
		await mockReset();

		for (const id of ['..%2Femployee', '%2e%2e%2femployee', '..%2f..%2femployee']) {
			const response = await api(ROUTE_OF(id));
			const body = await response.text();
			const witness = `${id} · ${describeAnswer(response.status(), body, response.headers())}`;
			expect(response.status(), `the encoded ../ spelling no longer meets the shape check: ${witness}`).toBe(400);
			expect(parseAnswer(body), `the encoded ../ refusal answer changed: ${witness}`).toEqual(REFUSAL);
		}
		expect(
			await mockRequests(),
			`an encoded ../ still reached the platform: ${logOf(await mockRequests())}`
		).toEqual([]);

		// `../` written plain is resolved by the client while building the request, so the answer is the app's own
		// 404 page rather than this route's 400 — measured, and the reason a fix may not assume the route saw it.
		for (const id of ['../employee', '../../employee']) {
			const response = await api(ROUTE_OF(id));
			const body = await response.text();
			const witness = `${id} · status ${response.status()} · body(${body.length}) ${body.slice(0, 60)} · content-type ${response.headers()['content-type']}`;
			expect(
				response.status(),
				`the raw ../ spelling is no longer answered away from this route: ${witness}`
			).toBe(404);
			expect(
				response.headers()['content-type'],
				`the raw ../ answer is no longer the app page: ${witness}`
			).toContain('text/html');
		}

		// Two segments: the route owns one dynamic segment, so the extra one has no route to answer it.
		const twoSegments = await api(ROUTE_OF(`${GOOD_ID}/extra`));
		const twoSegmentsBody = await twoSegments.text();
		expect(
			twoSegments.status(),
			`a second segment is answered by this route now: ${describeAnswer(twoSegments.status(), twoSegmentsBody, twoSegments.headers())}`
		).toBe(404);
		expect(
			twoSegments.headers()['content-type'],
			`the second-segment answer is not the app page: ${twoSegments.status()}`
		).toContain('text/html');
		expect(
			await mockRequests(),
			`a request that never reached the route asked the platform anyway: ${logOf(await mockRequests())}`
		).toEqual([]);
	});

	test('an exp of 1970 is forwarded by the download helper, which reads no claim of it', async ({
		api,
		cookies,
		ids
	}) => {
		const expired = mintAccessTokenWith({
			sub: ids.user,
			organizationId: ids.organizationA,
			iat: 100,
			exp: 100, // 1970-01-01T00:01:40Z
			jti: 'lane-d-expired'
		});
		await mockReset();

		const response = await api(GOOD_FILE, { headers: { cookie: withToken(cookies('A'), expired) } });
		const body = await response.text();
		const log = await mockRequests();
		const witness = describeAnswer(response.status(), body, response.headers());

		expect(response.status(), `an expired token is now refused by this app: ${witness}`).toBe(200);
		expect(
			asksFor(log, GOOD_FILE),
			`the expired-token download is not the call it was: ${witness} · log ${logOf(log)}`
		).toEqual([`GET ${GOOD_FILE} 200`]);
		// The hash the mock recorded is of this exact string: what left the app was the expired cookie token itself.
		expect(
			await receivedTokens(GOOD_FILE),
			`the bearer forwarded for an expired token is not that token: ${witness}`
		).toEqual([sha256(expired)]);
	});

	test('a token with no exp claim at all is forwarded too, on the download route and on the JSON proxy route', async ({
		api,
		cookies,
		ids
	}) => {
		const noExp = mintAccessTokenWith({ sub: ids.user, organizationId: ids.organizationA, jti: 'lane-d-no-exp' });
		await mockReset();

		const download = await api(GOOD_FILE, { headers: { cookie: withToken(cookies('A'), noExp) } });
		const downloadBody = await download.text();
		expect(
			download.status(),
			`the download helper now reads exp: ${describeAnswer(download.status(), downloadBody, download.headers())}`
		).toBe(200);
		expect(await receivedTokens(GOOD_FILE), `the download bearer is not the claim-free token`).toEqual([
			sha256(noExp)
		]);

		const proxy = await api('/api/auth/sessions', { headers: { cookie: withToken(cookies('A'), noExp) } });
		const proxyBody = await proxy.text();
		expect(
			proxy.status(),
			`the JSON proxy now reads exp: ${describeAnswer(proxy.status(), proxyBody, proxy.headers())}`
		).toBe(200);
		expect(await receivedTokens('/api/auth/sessions'), `the JSON proxy bearer is not the claim-free token`).toEqual(
			[sha256(noExp)]
		);
	});

	test('a chunked auth-token with a missing chunk is a 401, with nothing asked', async ({ api, cookies, ids }) => {
		// A live token, so the 401 below can only come from the missing chunk, not from an expired claim.
		const token = mintAccessToken(ids.user, ids.organizationA, 'lane-d-chunked');
		// Chunk 1 of two is the one this header does not carry.
		const header = withChunks(cookies('A'), '2', token.slice(0, 20));

		const response = await api(GOOD_FILE, { headers: { cookie: header } });
		const body = await response.text();
		const witness = describeAnswer(response.status(), body, response.headers());

		expect(response.status(), `a chunked session with a missing chunk was not refused: ${witness}`).toBe(401);
		expect(parseAnswer(body), `the missing-chunk refusal answer changed: ${witness}`).toEqual({
			statusCode: 401,
			message: 'Unauthorized'
		});
		expect(
			await mockRequests(),
			`a session that was refused still reached the platform: ${logOf(await mockRequests())}`
		).toEqual([]);
	});

	test('both chunks present is forwarded as their concatenation, which is what the mock hashed', async ({
		api,
		cookies,
		ids
	}) => {
		const token = mintAccessToken(ids.user, ids.organizationA, 'lane-d-chunks-ok');
		const header = withChunks(cookies('A'), '2', token.slice(0, 20), token.slice(20));

		const response = await api(GOOD_FILE, { headers: { cookie: header } });
		const body = await response.text();
		const log = await mockRequests();
		const witness = describeAnswer(response.status(), body, response.headers());

		expect(response.status(), `a two-chunk session was not accepted: ${witness}`).toBe(200);
		expect(
			asksFor(log, GOOD_FILE),
			`the two-chunk download is not the call it was: ${witness} · log ${logOf(log)}`
		).toEqual([`GET ${GOOD_FILE} 200`]);
		expect(
			await receivedTokens(GOOD_FILE),
			`the forwarded chunked token is not the concatenation of its chunks: ${witness}`
		).toEqual([sha256(token)]);
	});

	test('a chunk count outside 1..64 is treated as no chunked token at all, not as a loop', async ({
		api,
		cookies,
		ids
	}) => {
		const token = mintAccessToken(ids.user, ids.organizationA, 'lane-d-many-chunks');
		// One chunk of an announced thousand, and no plain `auth-token` entry anywhere in the header.
		const header = withChunks(cookies('A'), '1000', token.slice(0, 20));

		const response = await api(GOOD_FILE, { headers: { cookie: header } });
		const body = await response.text();
		const witness = describeAnswer(response.status(), body, response.headers());

		// token-chunks.ts:16 rejects anything that is not 1..3 digits, so request-cookies.ts:37 falls through to the
		// plain auth-token cookie — which this header does not carry — and the helper answers 401 (route half
		// forward-download-to-gauzy.ts:40).
		expect(response.status(), `an announced 1000 chunks was honoured as a chunked token: ${witness}`).toBe(401);
		expect(
			await mockRequests(),
			`the oversized chunk count reached the platform: ${logOf(await mockRequests())}`
		).toEqual([]);
	});
});
