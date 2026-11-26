import { createHash } from 'node:crypto';

import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { mockReset, receivedTokens } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * How this app forwards a file download from the Gauzy API, measured on lane-b (app 3032, mock 3996) on 2026-11-22.
 *
 * `core/services/server/forward-download-to-gauzy.ts` has exactly two callers in this tree (grep for the exported
 * name `forwardDownloadToGauzy`):
 *
 *   GET /api/export                                       `app/api/export/route.ts:13-18` — permission gate first,
 *                                                        then the download, with a 15-minute budget
 *   GET /api/plugins/docs/documents/:id/export.pdf        `…/documents/[id]/export.pdf/route.ts:11-14` — a zod guid
 *                                                        check, then the download, on the default 120 s budget
 *
 * The helper's own order (`forward-download-to-gauzy.ts:36-62`) is: read the cookies, take the tab bearer if there is
 * one, **refuse 401 when there is no token at all**, then fetch `GAUZY_API_SERVER_URL + path + the caller's query`,
 * then answer with `upstream.status` and only the five names of `PASSED_HEADERS`. There is **no origin check and no
 * media-type check anywhere in this family** — `refuseForeignWrite` is reached only through the export route's
 * permission gate, and it lets GET and HEAD through by definition (`same-origin-request.ts:43-46`).
 *
 * ## What the mock can and cannot answer here (measured, not assumed)
 *
 * `cypress/support/mock-gauzy-server.mjs` has **no handler for either download path**. Its fall-through for an
 * unknown GET is `pagination([])`, and it writes every answer with `writeHead(status, { ...cors, content-type })` +
 * `end(JSON.stringify(payload))` — which makes Node chunk it: the answer carries `content-type: application/json;
 * charset=utf-8`, `cache-control: no-store` and the CORS names, and **no `content-length` and no
 * `content-disposition`** (probe `E:\Coding\.tmp\lane-b-dl-probe-1.txt`, the `mock direct GET` block). So this file
 * pins the copy of what the upstream *does* send, and the absence of what it does not send. The filename half of the
 * helper (`attachment; filename=`, a quoted or non-ASCII name, the `application/octet-stream` fallback) and its
 * "drop the length of an encoded answer" branch are **not reachable through this mock at all** — they are pinned at
 * unit level in `core/services/server/forward-download-to-gauzy.test.ts:32-45` and `:58-63`, and the switches the
 * lane needs are written up in `PLAN.md` §13 rather than faked here.
 *
 * ## Who already owns a piece of this (nothing here is a second copy of it)
 *
 * - `suites/api/tab-session.spec.ts` owns the *credential* half of the same file route: which token is forwarded,
 *   the tab-bearer replacement, `x-tab-team-id` doing nothing on a proxy route, and the 401 a bearer alone gets.
 *   Here the bearer is pinned only as far as it is needed to say "the download route forwards the session cookie's
 *   token and nothing else", plus the tenant header, which that file cannot see on a path the mock does not grade.
 * - `suites/lane-c/permission-guard.spec.ts` owns `GET /api/export` anonymous 401 and signed-in 403. Here the export
 *   route appears for the ordering a download route has to answer: which of its refusals wins, and what its answer
 *   looks like when the permission read itself fails (that half is in `download-outage.spec.ts`).
 *
 * Every number below came from a probe log named in this header or from a run of this file
 * (`E:\Coding\.tmp\lane-b-dl-1.log` and later, each quoted in `PLAN.md` §13). The probes were read-only calls to this
 * lane's own app and its own mock; nothing left the machine.
 */

/** A well-formed guid for the route's own `z.guid()` check (the same one `suites/api/tab-session.spec.ts:61` uses). */
const DOCUMENT_ID = '2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d';
const FILE = `/api/plugins/docs/documents/${DOCUMENT_ID}/export.pdf`;
/** The mock logs the fetched path under the same `/api` prefix the app asked the platform for. */
const UP_FILE = FILE;
const EXPORT = '/api/export';
const PERMISSION_READ = '/api/role-permissions/me';
const FOREIGN_ORIGIN = 'https://some-other-site.example';

// No credential-shaped literal anywhere in this file: a download route takes no body, so a fixture password was
// never needed. Hashes are of the mock's own bytes and of the fixture session token this lane mints.
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** The mock's own answer to the download path, read directly: the bytes and headers the app is about to be given. */
async function askMockDirectly(path: string) {
	const response = await fetch(`${MOCK_ORIGIN}${path}`, { method: 'GET' });
	const text = await response.text();
	return { status: response.status, text, headers: Object.fromEntries(response.headers) };
}

/** The calls the mock recorded for one upstream path, as `POST /api/x 200` lines. */
const asksFor = (requests: Array<{ method: string; path: string; status: number }>, path: string) =>
	triples(requests.filter((request) => request.path === path));

/** The `auth-token` value of a `Cookie:` header this spec built, so a hash can be compared with the mock's record. */
const tokenOf = (cookieHeader: string) => {
	const entry = cookieHeader.split('; ').find((part) => part.startsWith('auth-token='));
	return entry ? entry.slice('auth-token='.length) : '';
};

/** A `Cookie:` header with named entries dropped: the session that is missing exactly one thing. */
const cookiesWithout = (cookieHeader: string, ...names: string[]) =>
	cookieHeader
		.split('; ')
		.filter((entry) => !names.includes(entry.split('=')[0]))
		.join('; ');

/**
 * An unsigned three-part token, the shape `helpers.ts` writes into `auth-token` and `suites/api/tab-session.spec.ts`
 * mints for the same reason: this file has to hand the app a token whose *claims* differ from the fixture's (an `exp`
 * that has passed) while keeping everything else identical. `decodeJWT` reads it without verifying the signature.
 * Owed to whoever owns the harness: the same five lines exist in `suites/api/tab-session.spec.ts` and in
 * `playwright/helpers.ts`; a lane may not edit either, so they are repeated here rather than shared.
 */
const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenWithClaims = (claims: Record<string, unknown>) =>
	`${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ iat: 1_700_000_000, ...claims })}.fixture`;

/** Carried by every failure message of the header cases, so a red prints the whole answer rather than one header. */
const describeAnswer = (response: APIResponse, text: string) =>
	`status ${response.status()} · body(${text.length}) ${text.slice(0, 160)} · headers ` +
	JSON.stringify(
		Object.entries(response.headers())
			.filter(([name]) => !['date', 'connection', 'keep-alive', 'vary'].includes(name))
			.sort()
	);

test.describe('lane-b · the download proxy: what the answer carries', () => {
	test('GET the pdf route streams the upstream body through, unchanged, with the headers it was given', async ({
		api,
		mock
	}) => {
		// The upstream first, so the log the assertions read is only the app's own call.
		const upstream = await askMockDirectly(UP_FILE);
		await mockReset();

		const response = await api(FILE);
		const text = await response.text();
		const headers = response.headers();
		const log = await mock.requests();
		const witness = describeAnswer(response, text);

		expect(response.status(), `the forwarded download moved its status (${witness})`).toBe(200);
		// Byte-for-byte, hashed on both sides: what the mock wrote, and what this app handed the caller.
		expect(sha256(text), `the body is no longer the upstream body hash-for-hash (${witness})`).toBe(
			sha256(upstream.text)
		);
		expect(text, `the body text moved (${witness})`).toBe(upstream.text);

		// `PASSED_HEADERS` copied verbatim where the upstream sent them — the copied content-type carries the mock's
		// own `charset`, which proves the copy ran and that the `application/octet-stream` fallback (line 75) did not.
		expect(headers['content-type'], `content-type is no longer the upstream one copied verbatim (${witness})`).toBe(
			upstream.headers['content-type']
		);
		expect(headers['content-type'], `the octet-stream fallback fired (${witness})`).not.toBe(
			'application/octet-stream'
		);
		expect(headers['cache-control'], `cache-control is not the copied no-store (${witness})`).toBe('no-store');

		// What the whitelist had nothing to copy, measured off the mock's own answer: it sends neither name.
		expect(
			headers['content-disposition'],
			`the answer now carries a content-disposition the mock never sent (${witness}) — the mock gained a ` +
				'download handler, so the filename half of this file has to be written for real'
		).toBeUndefined();
		expect(
			headers['content-length'],
			`the answer now carries a content-length (${witness}) — the mock answers chunked today ` +
				'(writeHead + end), so there is nothing to copy'
		).toBeUndefined();
		expect(headers['x-content-type-options'], `x-content-type-options appeared (${witness})`).toBeUndefined();

		// The mock's CORS half is not on the whitelist, and a proxy route writes no cookie of its own.
		expect(
			headers['access-control-allow-origin'],
			`the upstream CORS header travelled (${witness})`
		).toBeUndefined();
		expect(
			response.headersArray().filter((header) => header.name.toLowerCase() === 'set-cookie'),
			`the download route wrote a cookie (${witness})`
		).toEqual([]);

		expect(asksFor(log, UP_FILE), `the upstream call the mock recorded changed: ${logOf(log)}`).toEqual([
			`GET ${UP_FILE} 200`
		]);
	});

	test('the route fixes the path and hands the whole query string on, in the order it was given', async ({
		api,
		mock
	}) => {
		const query = 'subtree=true&format=zip&file=a%20b.pdf&emoji=%F0%9F%98%80';
		const response = await api(`${FILE}?${query}`);
		const text = await response.text();
		const log = await mock.requests();
		const witness = describeAnswer(response, text);

		expect(response.status(), `the query-carrying download answered ${witness}`).toBe(200);
		expect(
			log.map((request) => request.method),
			`the upstream verb changed (${witness})`
		).toEqual(['GET']);
		expect(
			log.map((request) => request.path),
			`the path the mock was asked for is no longer the route own path (${witness}): ${logOf(log)}`
		).toEqual([UP_FILE]);
		// Measured in E:\Coding\.tmp\lane-b-dl-probe-2.txt: the order survives, `%20` arrives as `+` and the emoji
		// stays percent-encoded, because the mock logs `searchParams.toString()` of what the app fetched.
		expect(
			log.map((request) => request.query),
			`the query that reached the API is not the caller's own (${witness}): ${logOf(log)}`
		).toEqual(['subtree=true&format=zip&file=a+b.pdf&emoji=%F0%9F%98%80']);
	});

	test('no query on the request means no query at the API, not an empty one appended', async ({ api, mock }) => {
		const response = await api(`${FILE}?`);
		const log = await mock.requests();
		expect(response.status(), describeAnswer(response, await response.text())).toBe(200);
		expect(
			log.map((request) => request.query),
			`an empty search reached the API as ${JSON.stringify(log.map((request) => request.query))}`
		).toEqual(['']);
	});

	test('a caller with no session token is refused by the helper itself, before the API is asked', async ({
		api,
		mock
	}) => {
		const response = await api(FILE, { anonymous: true });
		const text = await response.text();
		const witness = describeAnswer(response, text);

		expect(response.status(), `a sessionless download answered ${witness}`).toBe(401);
		expect(parseAnswer(text), `the 401 is not the helper own body (${witness})`).toEqual({
			statusCode: 401,
			message: 'Unauthorized'
		});
		// The app's own JSON, so its content-type carries no charset — unlike the copied one of a forwarded answer.
		expect(response.headers()['content-type'], `the 401 content-type changed (${witness})`).toBe(
			'application/json'
		);
		expect(response.headers()['content-disposition'], `the 401 carries a disposition (${witness})`).toBeUndefined();
		expect(
			await mock.requests(),
			`the sessionless refusal asked the API anyway: ${logOf(await mock.requests())}`
		).toEqual([]);
	});

	test('the guid check answers ahead of the bearer check: a bad id is 400 with no session at all', async ({
		api,
		mock
	}) => {
		const signedIn = await api('/api/plugins/docs/documents/not-a-guid/export.pdf');
		const signedInText = await signedIn.text();
		const anonymous = await api('/api/plugins/docs/documents/not-a-guid/export.pdf', { anonymous: true });
		const anonymousText = await anonymous.text();

		expect(signedIn.status(), describeAnswer(signedIn, signedInText)).toBe(400);
		expect(signedInText, `the id refusal moved (${signedIn.status()})`).toBe(
			'{"error":"A document id is required"}'
		);
		expect(
			anonymous.status(),
			`a bad id with no session answered ${anonymous.status()} ${anonymousText} — the bearer check, not the ` +
				'guid check, answered first'
		).toBe(400);
		expect(anonymousText, `the anonymous id refusal moved (${anonymous.status()})`).toBe(
			'{"error":"A document id is required"}'
		);
		expect(await mock.requests(), `a refused id reached the API: ${logOf(await mock.requests())}`).toEqual([]);
	});

	test('the id gate is a hex shape check, not a UUID version check, and an accepted id travels verbatim', async ({
		api,
		ids,
		mock
	}) => {
		// `z.guid()` of zod 4.6.6 accepts any 8-4-4-4-12 hex groups, in either case, whatever the version and variant
		// nibbles say; it refuses a UUID without dashes and one that is a character short. Measured in
		// E:\Coding\.tmp\lane-b-dl-probe-4.txt; the same file's rows are pinned here.
		const accepted = [
			'11111111-1111-1111-1111-111111111111',
			'00000000-0000-0000-0000-000000000000',
			'2F7E0B3A-4A53-4A1C-9C0E-8D7B6A5F4E3D'
		];
		const refused = ['2f7e0b3a4a534a1c9c0e8d7b6a5f4e3d', '2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3', 'not-a-guid'];

		for (const id of accepted) {
			await mockReset();
			const response = await api(`/api/plugins/docs/documents/${id}/export.pdf`);
			const text = await response.text();
			const log = await mock.requests();
			expect(
				response.status(),
				`id ${id} was refused by the guid gate: ${describeAnswer(response, text)} — the validator got stricter`
			).toBe(200);
			expect(
				asksFor(log, `/api/plugins/docs/documents/${id}/export.pdf`),
				`id ${id} did not reach the API as itself: ${logOf(log)} (fixture tenant ${ids.tenantA})`
			).toEqual([`GET /api/plugins/docs/documents/${id}/export.pdf 200`]);
		}

		for (const id of refused) {
			await mockReset();
			const response = await api(`/api/plugins/docs/documents/${id}/export.pdf`);
			const text = await response.text();
			expect(
				response.status(),
				`id ${id} was let through: ${describeAnswer(response, text)} — the validator got looser`
			).toBe(400);
			expect(text, `the refusal body for ${id} moved (${response.status()})`).toBe(
				'{"error":"A document id is required"}'
			);
			expect(await mock.requests(), `id ${id} reached the API anyway: ${logOf(await mock.requests())}`).toEqual(
				[]
			);
		}
	});

	test('a download read is not a write: a cross-site pdf request is forwarded with the session bearer', async ({
		api,
		mock,
		cookies
	}) => {
		// `refuseForeignWrite` returns null for GET and HEAD, and the download helper calls no origin guard at all, so
		// a page on another site that the browser will attach this session's cookies to is served the file.
		// The cookie is handed over explicitly, and hashed from the same string: `api()` mints its own session token on
		// every call (`helpers.ts` re-derives `authCookieNames` with `iat` at `Date.now()`), so hashing a second read
		// of the fixture would compare the mock's record against a different token.
		const cookie = cookies('A');
		const crossSiteCases: Array<Record<string, string>> = [
			{ origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' },
			{ 'sec-fetch-site': 'same-site' },
			{ origin: FOREIGN_ORIGIN }
		];
		for (const headers of crossSiteCases) {
			await mockReset();
			const response = await api(FILE, { headers: { ...headers, cookie } });
			const text = await response.text();
			const log = await mock.requests();
			const witness = `${JSON.stringify(headers)} -> ${describeAnswer(response, text)}`;
			expect(response.status(), `the download route grew an origin guard: ${witness}`).toBe(200);
			expect(
				asksFor(log, UP_FILE),
				`the forwarded cross-site read did not reach the API: ${logOf(log)} (${witness})`
			).toEqual([`GET ${UP_FILE} 200`]);
			const tokens = await receivedTokens(UP_FILE);
			expect(
				tokens,
				`the forwarded cross-site read carried no bearer: ${JSON.stringify(tokens)} (${witness})`
			).toEqual([sha256(tokenOf(cookie))]);
		}
	});

	test('the two download routes answer the same signed-in caller differently: only one names a permission', async ({
		api,
		mock
	}) => {
		// The document route has no permission gate; the export route has one, and the fixture role does not satisfy it.
		const file = await api(FILE);
		const fileText = await file.text();
		const exportResponse = await api(EXPORT);
		const exportText = await exportResponse.text();
		const log = await mock.requests();

		expect(file.status(), `the document download gained a gate: ${describeAnswer(file, fileText)}`).toBe(200);
		expect(
			exportResponse.status(),
			`the workspace export no longer refuses the fixture role: ${describeAnswer(exportResponse, exportText)}`
		).toBe(403);
		expect(exportText, `the export refusal body moved (${exportResponse.status()})`).toBe(
			'{"statusCode":403,"message":"Forbidden resource"}'
		);
		// The gate is real and its reason is measurable: these are the permissions the mock really grants the role.
		const permissions = await api(PERMISSION_READ);
		const rows = (await permissions.json()) as Array<{ permission?: string; enabled?: boolean }>;
		const held = rows.filter((row) => row.enabled === true).map((row) => row.permission);
		expect(
			held,
			`the fixture role's permission list changed (${JSON.stringify(held)}) — with EXPORT_ADD in it the export ` +
				'route would start forwarding, and this file would have to pin the forwarded half'
		).toEqual(['TIME_TRACKER', 'ORG_TASK_ADD', 'ORG_TASK_EDIT', 'ORG_INVITE_EDIT', 'ORG_EMPLOYEES_EDIT']);
		expect(asksFor(log, EXPORT), `the export route asked its own upstream despite refusing: ${logOf(log)}`).toEqual(
			[]
		);
	});

	test('a cross-site GET of the workspace export is refused for the permission, not for its origin', async ({
		api,
		mock
	}) => {
		// `refuseUnlessPermitted` runs `refuseForeignWrite` first (`refuse-without-permission.ts:38-41`), but that
		// guard answers only writes (`same-origin-request.ts:43-46`), so for a GET the answer is the permission
		// refusal — a different 403 body from the shared origin guard's.
		const response = await api(EXPORT, {
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const text = await response.text();
		const witness = describeAnswer(response, text);
		const log = await mock.requests();

		expect(response.status(), `a cross-site export read answered ${witness}`).toBe(403);
		expect(
			text,
			`the export route answered with the origin guard body instead of the permission body (${witness})`
		).toBe('{"statusCode":403,"message":"Forbidden resource"}');
		// The log is the proof of *which* guard answered. Written here as `toEqual([])` on the prediction that a
		// cross-site request is turned away before anything is asked; the run of 2026-11-22
		// (`E:\Coding\.tmp\lane-b-dl-1.log`, test 9) showed one call — `GET /api/role-permissions/me 200` — so the
		// origin guard did not stop it and the permission read did. Re-pinned to what was measured, which is the
		// stronger claim: the permission read is the only thing the refusal asked, and the export path was not asked.
		expect(
			triples(log),
			`the cross-site export refusal asked something other than the permission read: ${logOf(log)}`
		).toEqual([`GET ${PERMISSION_READ} 200`]);
		expect(asksFor(log, EXPORT), `the export route asked its own upstream despite refusing: ${logOf(log)}`).toEqual(
			[]
		);
	});
});

test.describe('lane-b · the download proxy: the verbs a GET-only file route answers', () => {
	test('HEAD is answered by the GET handler, empty-bodied, and it costs a full upstream GET', async ({
		api,
		mock
	}) => {
		const response = await api(FILE, { method: 'HEAD' });
		const text = await response.text();
		const headers = response.headers();
		const log = await mock.requests();
		const witness = describeAnswer(response, text);

		expect(response.status(), `HEAD on the file route answered ${witness}`).toBe(200);
		expect(text, `HEAD returned a body (${witness})`).toBe('');
		expect(headers['content-type'], `HEAD lost the copied content-type (${witness})`).toBe(
			'application/json; charset=utf-8'
		);
		expect(headers['cache-control'], `HEAD lost the copied cache-control (${witness})`).toBe('no-store');
		expect(headers['content-disposition'], `HEAD invented a disposition (${witness})`).toBeUndefined();
		// The point of the case: the upstream was asked, once, as a GET — a HEAD on this route is not a cheap probe.
		expect(
			asksFor(log, UP_FILE),
			`the HEAD probe did not reach the API as a GET: ${logOf(log)} (${witness})`
		).toEqual([`GET ${UP_FILE} 200`]);
	});

	test('OPTIONS answers the preflight itself with an allow list, and never asks the API', async ({ api, mock }) => {
		for (const path of [FILE, EXPORT]) {
			await mockReset();
			const response = await api(path, { method: 'OPTIONS' });
			const text = await response.text();
			const witness = describeAnswer(response, text);
			expect(response.status(), `${path} answered OPTIONS with ${witness}`).toBe(204);
			expect(response.headers()['allow'], `${path} answered OPTIONS without an allow list (${witness})`).toBe(
				'GET, HEAD, OPTIONS'
			);
			expect(text, `${path} answered OPTIONS with a body (${response.status()})`).toBe('');
			expect(
				await mock.requests(),
				`${path} asked the API for an OPTIONS: ${logOf(await mock.requests())}`
			).toEqual([]);
		}
	});

	test(
		'POST, PUT and DELETE on a GET-only download route are refused by Next with an empty body, no content-type ' +
			'and no allow',
		async ({ api, mock }) => {
			for (const method of ['POST', 'PUT', 'DELETE'] as const) {
				await mockReset();
				const response = await api(FILE, {
					method,
					body: method === 'POST' ? { subtree: true } : undefined,
					headers: method === 'POST' ? { 'content-type': 'application/json' } : {}
				});
				const text = await response.text();
				const witness = describeAnswer(response, text);
				expect(response.status(), `${method} ${FILE} answered ${witness}`).toBe(405);
				expect(text, `${method} ${FILE} answered with a body (${response.status()})`).toBe('');
				expect(
					response.headers()['content-type'],
					`${method} ${FILE} now answers with a content-type (${witness}) — a handler started handling it`
				).toBeUndefined();
				expect(
					response.headers()['allow'],
					`${method} ${FILE} answered with an allow list (${witness}) — only the OPTIONS answer has one today`
				).toBeUndefined();
				expect(
					await mock.requests(),
					`${method} ${FILE} reached the API despite the verb refusal: ${logOf(await mock.requests())}`
				).toEqual([]);
			}
		}
	);

	test('POST on the export route is a verb refusal too, so no body ever reaches the permission gate', async ({
		api,
		mock
	}) => {
		const response = await api(EXPORT, { method: 'POST', body: { format: 'zip' } });
		const text = await response.text();
		expect(response.status(), `POST ${EXPORT} answered ${describeAnswer(response, text)}`).toBe(405);
		expect(text, `POST ${EXPORT} answered with a body (${response.status()})`).toBe('');
		expect(
			await mock.requests(),
			`POST ${EXPORT} read the permissions anyway: ${logOf(await mock.requests())}`
		).toEqual([]);
	});

	test('HEAD on the export route runs the permission gate and answers its 403 with an empty body', async ({
		api,
		mock
	}) => {
		const response = await api(EXPORT, { method: 'HEAD' });
		const text = await response.text();
		const log = await mock.requests();
		const witness = describeAnswer(response, text);

		expect(response.status(), `HEAD ${EXPORT} answered ${witness}`).toBe(403);
		expect(text, `HEAD ${EXPORT} returned a body (${response.status()})`).toBe('');
		expect(response.headers()['content-type'], `HEAD ${EXPORT} lost the JSON content-type (${witness})`).toBe(
			'application/json'
		);
		expect(
			asksFor(log, PERMISSION_READ),
			`HEAD ${EXPORT} answered without reading the role permissions first: ${logOf(log)}`
		).toEqual([`GET ${PERMISSION_READ} 200`]);
	});
});

test.describe('lane-b · the session token a download route accepts', () => {
	test('a token whose exp claim has passed is forwarded as it is: the route reads the cookie, not its claims', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		// `forward-download-to-gauzy.ts:37-40` asks only whether a token cookie exists. Nothing on this route decodes
		// it — the decode at `tab-session.ts:44-45` runs only when a *bearer header* is present, and `exp` is never
		// consulted anywhere. Measured in E:\Coding\.tmp\lane-b-dl-probe-5.txt: an `exp` an hour past, and an `exp` of
		// 1000 (1970), both forwarded. In a browser run the door in `proxy.ts` refuses that session first; on `/api`
		// there is no door (`proxy.ts` matcher excludes api), so the file is served.
		const hourAgo = Math.floor(Date.now() / 1000) - 3_600;
		for (const token of [
			tokenWithClaims({ sub: ids.user, organizationId: ids.organizationA, iat: hourAgo - 3_600, exp: hourAgo }),
			tokenWithClaims({ sub: ids.user, organizationId: ids.organizationA, iat: 1_000, exp: 1_000 })
		]) {
			await mockReset();
			const response = await api(FILE, {
				headers: { cookie: cookiesWithout(cookies('A'), 'auth-token') + `; auth-token=${token}` }
			});
			const text = await response.text();
			const log = await mock.requests();
			expect(
				response.status(),
				`an expired session was refused here (${response.status()} ${text.slice(0, 120)}) — something on this ` +
					'route started validating the token, which it does not do today'
			).toBe(200);
			expect(triples(log), `the expired session did not reach the API: ${logOf(log)}`).toEqual([
				`GET ${UP_FILE} 200`
			]);
			expect(
				await receivedTokens(UP_FILE),
				`the bearer that travelled is not the expired cookie: ${JSON.stringify(await receivedTokens(UP_FILE))}`
			).toEqual([sha256(token)]);
		}
	});

	test('a chunked auth-token is reassembled and forwarded as one bearer', async ({ api, ids, mock }) => {
		// `requestAccessToken` (`request-cookies.ts:26-38`) joins `auth-token0..N` when `auth-token_totalChunks` names
		// them, and that joined string is what the download proxy writes into `authorization`.
		const chunks = ['chunk-one-', 'chunk-two-', 'chunk-three'];
		const cookie = [
			`auth-token_totalChunks=${chunks.length}`,
			...chunks.map((chunk, index) => `auth-token${index}=${chunk}`),
			`auth-tenant-id=${ids.tenantA}`
		].join('; ');
		const response = await api(FILE, { headers: { cookie } });
		const text = await response.text();
		const log = await mock.requests();

		expect(response.status(), `the chunked session answered ${response.status()} ${text.slice(0, 120)}`).toBe(200);
		expect(triples(log), `the chunked session did not reach the API: ${logOf(log)}`).toEqual([
			`GET ${UP_FILE} 200`
		]);
		expect(
			await receivedTokens(UP_FILE),
			'the bearer the mock recorded is not the hash of the chunks joined'
		).toEqual([sha256(chunks.join(''))]);
	});

	test('a chunk count with a chunk missing is refused here, with the API never asked', async ({ api, ids, mock }) => {
		const cookie = [
			`auth-token_totalChunks=3`,
			'auth-token0=aa',
			'auth-token1=bb',
			`auth-tenant-id=${ids.tenantA}`
		].join('; ');
		const response = await api(FILE, { headers: { cookie } });
		const text = await response.text();
		expect(response.status(), `an incomplete chunked token was served the file: ${text.slice(0, 120)}`).toBe(401);
		expect(parseAnswer(text), `the incomplete-token refusal body moved (${response.status()})`).toEqual({
			statusCode: 401,
			message: 'Unauthorized'
		});
		expect(await mock.requests(), `the incomplete token reached the API: ${logOf(await mock.requests())}`).toEqual(
			[]
		);
	});
});

test.describe('lane-b · what the download proxy asks the upstream with', () => {
	test('the credential that leaves is the session cookie token, hashed by the mock as its own', async ({
		api,
		cookies,
		mock
	}) => {
		const cookie = cookies('A');
		const response = await api(FILE, { headers: { cookie } });
		const text = await response.text();
		expect(response.status(), describeAnswer(response, text)).toBe(200);
		const tokens = await receivedTokens(UP_FILE);
		expect(
			tokens,
			`the bearer the mock recorded for ${UP_FILE} is not the hash of the session cookie it was handed: ` +
				`${JSON.stringify(tokens)}`
		).toEqual([sha256(tokenOf(cookie))]);
	});

	test('the tenant header upstream is the auth-tenant-id cookie: a differential on the mock drop key', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		/**
		 * The only witness this harness has for a header the app *writes* upstream: `scenario.drops` addresses a call
		 * as `tenant:path`, then `tenant`, then `path`, where `tenant` is the `tenant-id` header the mock received
		 * (`cypress/support/mock-gauzy-server.mjs`, its `tenantId` read). Arming `tenantA:path` therefore fires only
		 * when the app sent tenant A, and the four rows below are one fact read four ways.
		 */
		const arm = `${ids.tenantA}:${UP_FILE}`;
		const cookieA = cookies('A');
		const cookieB = cookies('B');
		const cases: Array<{ what: string; headers: Record<string, string>; dropped: boolean }> = [
			{ what: 'the session own tenant cookie', headers: { cookie: cookieA }, dropped: true },
			{ what: 'another tenant cookie', headers: { cookie: cookieB }, dropped: false },
			{
				what: 'no tenant cookie at all',
				headers: { cookie: cookiesWithout(cookieA, 'auth-tenant-id') },
				dropped: false
			},
			{
				what: 'a caller-supplied tenant-id header of another tenant',
				headers: { cookie: cookieA, 'tenant-id': ids.tenantB },
				dropped: true
			}
		];

		for (const item of cases) {
			await mockReset();
			await mock.scenario({ drops: { [arm]: 1 } });
			const response = await api(FILE, { headers: item.headers });
			const text = await response.text();
			const log = await mock.requests();
			const witness = `${item.what}: status ${response.status()} body ${text.slice(0, 120)} log ${logOf(log)}`;
			const armedCall = log.find((request) => request.path === UP_FILE);
			expect(
				armedCall?.status ?? -1,
				`${witness} — the mock recorded ${JSON.stringify(
					armedCall?.status
				)}, so the tenant-id header the app sent was not the one this arm addresses`
			).toBe(item.dropped ? 0 : 200);
			expect(
				response.status(),
				`${witness} — the app answered ${response.status()}, not ${item.dropped ? 'the outage answer' : 'the file'}`
			).toBe(item.dropped ? 502 : 200);
		}
	});

	test('no organisation header is written upstream, and dropping the organisation cookie changes nothing', async ({
		api,
		cookies,
		mock
	}) => {
		// `forward-download-to-gauzy.ts:41-49` builds exactly three headers: Accept, authorization and `tenant-id`
		// from the tenant cookie. The organisation and team cookies are not even read here (the same reading
		// `suites/api/tab-session.spec.ts` measures on the JSON route); what is measurable is that dropping them
		// leaves the forwarded call identical.
		const full = await api(FILE, { headers: { cookie: cookies('A') } });
		const fullText = await full.text();
		const fullLog = await mock.requests();
		await mockReset();
		const stripped = await api(FILE, {
			headers: { cookie: cookiesWithout(cookies('A'), 'auth-organization-id', 'auth-active-team') }
		});
		const strippedText = await stripped.text();
		const strippedLog = await mock.requests();

		expect(full.status(), describeAnswer(full, fullText)).toBe(200);
		expect(stripped.status(), describeAnswer(stripped, strippedText)).toBe(200);
		expect(
			triples(strippedLog),
			`dropping the organisation/team cookies changed the upstream call: ${logOf(strippedLog)} against ${logOf(
				fullLog
			)}`
		).toEqual(triples(fullLog));
		expect(
			await receivedTokens(UP_FILE),
			'the two calls forwarded different bearer hashes, so a cookie was in fact read'
		).toHaveLength(1);
	});
});

/**
 * The third route with `download` in its name, kept out of the two describes above on purpose:
 * `app/api/invoices/download/[id]/route.ts` does **not** call `forwardDownloadToGauzy` — it hands a PDF to
 * `forwardToGauzy` (`:14`, the JSON proxy), so it is pinned only for its gate, which is the half of it this harness
 * can reach. Measured in `E:\Coding\.tmp\lane-b-dl-probe-7.txt` before these cases were written: signed in it answers
 * 403 `{"statusCode":403,"message":"Forbidden resource"}` having asked only the permission read, and anonymously 401
 * `{"statusCode":401,"message":"Unauthorized"}` having asked nothing. What it would hand a caller that *passes* the
 * gate — a PDF answer with no `Content-Disposition`, because the JSON proxy copies no such header — is unreachable
 * here, because the fixture role holds neither `INVOICES_VIEW` nor a rate-admin permission
 * (`core/lib/utils/invoice-access.ts:3`, `core/lib/utils/rates.ts:258-260`); see PLAN §13.10.
 */
test.describe('lane-b · the invoice download route, which forwards through the JSON proxy', () => {
	const INVOICE = `/api/invoices/download/${DOCUMENT_ID}`;

	test('the invoice pdf route refuses the fixture role before it forwards anything', async ({ api, mock }) => {
		const response = await api(INVOICE);
		const text = await response.text();
		const witness = describeAnswer(response, text);
		const log = await mock.requests();

		expect(response.status(), `the invoice download gate moved (${witness})`).toBe(403);
		expect(text, `the invoice download refusal body moved (${witness})`).toBe(
			'{"statusCode":403,"message":"Forbidden resource"}'
		);
		expect(
			triples(log),
			`the invoice download refusal asked something other than the permission read: ${logOf(log)}`
		).toEqual([`GET ${PERMISSION_READ} 200`]);
		expect(asksFor(log, INVOICE), `the refused route forwarded anyway: ${logOf(log)}`).toEqual([]);
	});

	test('an anonymous invoice download is refused before the permission read is even attempted', async ({
		api,
		mock
	}) => {
		const response = await api(INVOICE, { anonymous: true });
		const text = await response.text();
		const witness = describeAnswer(response, text);
		const log = await mock.requests();

		expect(response.status(), `the anonymous invoice download answered ${witness}`).toBe(401);
		expect(text, `the anonymous refusal body moved (${witness})`).toBe(
			'{"statusCode":401,"message":"Unauthorized"}'
		);
		// `refuseUnlessPermitted` reads the permissions *through* `forwardToGauzy`, and that helper refuses a caller
		// with no token before it fetches, so an anonymous hit asks the platform nothing at all.
		expect(
			triples(log),
			`an anonymous invoice download asked the API after all: ${logOf(log)} (${witness})`
		).toEqual([]);
	});
});
