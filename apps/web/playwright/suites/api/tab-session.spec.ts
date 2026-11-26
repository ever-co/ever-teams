import { createHash } from 'node:crypto';

import { expect, test, type ApiCall, type CookieComposer } from '../../api-fixtures';
import { APP_ORIGIN, mockReset, receivedTokens } from '../../helpers';

/** What the mock records of a token it received (`helpers.ts:56-61`, `mock-gauzy-server.mjs:1052-1058`). */
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * `tabSessionOf` (`core/services/server/tab-session.ts:31-59`) decides **which access token a proxied request is
 * forwarded with** — `AUDIT.md` finding 9, untested before this file. What the code does, read off it and measured
 * route by route in lane-c (app 3033, mock 4002): `E:\Coding\.tmp\api-tab-session-lane-c-2.log`, `Running 19 tests
 * using 1 worker` / `19 passed (8.6s)`; the repeat of that file and its summary line are in the commit that adds it.
 * The first run, `…-1.log`, was `8 failed / 10 passed` of 18 and is kept because the two harness traps below are what
 * those failures came from.
 *
 * - It is not a cookie, and there is no tab-session cookie to handle. `tab-session.ts` reads two request headers and
 *   nothing else: `authorization` (`:36-37`) and `x-tab-team-id` (`:39`; the name is
 *   `core/lib/auth/tab-team-header.ts:6`). Every cookie the app names is in `core/constants/config/constants.tsx:136-149`
 *   (`auth-token`, `auth-refresh-token`, `auth-active-team`, `auth-tenant-id`, `auth-organization-id`, …) and none of
 *   them is a tab id, so a "tab session" is a *header pair on one request*, never a second stored session. The only
 *   cookie knowledge the helper can get is a string its caller hands it (`sharedOrganizationId`, `:34`).
 * - Its cookie half is unreachable on every proxy route. `isOtherThanCookie` (`:56`) needs
 *   `namesTabTeam && !!sharedOrganizationId`, but the two proxy callers pass **two** arguments
 *   (`forward-to-gauzy.ts:95`, `forward-download-to-gauzy.ts:39`), so `sharedOrganizationId` is `undefined` there and
 *   `isOtherThanCookie` can never be true on a proxied route. Only the guard passes the third one
 *   (`guards/authenticated-guard-app.ts:66`). Measured below: on a proxy route the exact trigger of that branch — the
 *   session's own token in `authorization`, a team named in `x-tab-team-id`, and an `auth-organization-id` cookie
 *   naming another organization — leaves the session's own token in place and the request acts in the organization the
 *   mock grants for the cookie tenant.
 * - What *is* reachable on a proxy route is `isOtherThanSession` (`:55`): a bearer of the same person
 *   (`id ?? sub`) and the same `tenantId` (`:47-52`) naming another organization (`:53-55`) replaces the cookie token
 *   (`:58`, taken at `forward-to-gauzy.ts:95` / `forward-download-to-gauzy.ts:39` and written as the upstream
 *   `authorization` at `forward-to-gauzy.ts:118`). Its claims come from `decodeJWT`
 *   (`core/lib/auth/jwt-utils.ts:42-61`), which decodes **without verifying the signature** and needs numeric
 *   `iat`/`exp` (`:51-54`). Whether an unsigned token is accepted upstream is not a lane question at all: the mock
 *   records a bearer's sha256 (`:1052-1058`) and at most asks that a `Bearer ` prefix is there
 *   (`everPlatformResponse`, `:910-912`) — it never validates one.
 * - A proxy route cannot be authenticated by a bearer alone: with no session cookie there is no `sharedToken`,
 *   `tab-session.ts:38` returns null before looking at the header, and `forward-to-gauzy.ts:96` answers 401 with the
 *   API never asked.
 * - `/api/*` never reaches the door: `proxy.ts` matches `'/((?!api|_next|_vercel|.*\\..*).*)'`
 *   (`apps/web/proxy.ts:100`), so its `deny_redirect` (`:175-185`) and its token refresh (`:226-241`) are not part of
 *   any answer here.
 *
 * The witnesses, and their limits: the mock answers any bearer it is given and records only its sha256 per path
 * (`receivedTokens`, `helpers.ts:58-61`), and its request log reports method, path and status only
 * (`mock-gauzy-server.mjs:1097`) — no header, no query, no cookie. So this file pins **which credential left the
 * app** and **which request the app was able to make** (the mock grades `POST /auth/switch-organization` on the
 * `tenant-id` request header it received, `:542-548`), and nothing about what the API would have accepted. Two
 * consequences a case must respect: the log accumulates *within* a test (`api-fixtures.ts:51-64` resets only between
 * tests), so a loop resets it (`helpers.ts:118` `mockReset`); and the fixture's own token is re-minted on every read
 * of the cookies (`helpers.ts:166-170` puts `iat` at `Date.now()`, second resolution), so a case that compares a hash
 * mints its session token itself rather than re-deriving it.
 */

/** The three call sites of the helper a lane can drive: the JSON proxy (`forward-to-gauzy.ts:95`), its write, and the download proxy (`:39`). */
const READ = '/api/role-permissions/me'; // app/api/role-permissions/me/route.ts:8 → GET /role-permissions/me
const WRITE = '/api/auth/switch-organization'; // app/api/auth/switch-organization/route.ts:8 → POST /auth/switch-organization
/** A well-formed document id: `app/api/plugins/docs/documents/[id]/export.pdf/route.ts:5,12-14` parses it; the mock answers the path. */
const DOCUMENT_ID = '2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d';
const FILE = `/api/plugins/docs/documents/${DOCUMENT_ID}/export.pdf`;
/** The guard's own session check — the 3-argument caller (`authenticated-guard-app.ts:66`) reaches the mock here. */
const ME = '/api/user/me';

const FOREIGN_ORIGIN = 'https://not-this-app.example';

/**
 * A token of the shape `helpers.ts:165-170` builds for the fixture session (`alg: none`, three parts, a signature
 * nothing checks), so the app's `decodeJWT` reads my claims the way it reads the session's own. `iat`/`exp` are
 * required (`jwt-utils.ts:51-54`). `jti` is unique per mint, because a case compares the hash of the exact token it
 * handed the app, and because `authenticatedGuard` shares one session check per bearer for 5 s
 * (`authenticated-guard-app.ts:29-31,79-81`) — a shared check would hide a call the mock answered.
 */
let minted = 0;
const b64 = (value: unknown) =>
	Buffer.from(JSON.stringify(value)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function tokenWith(claims: Record<string, unknown>): string {
	const now = Math.floor(Date.now() / 1000);
	return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iat: now, exp: now + 86_400, jti: `tab-session-${(minted += 1)}`, ...claims })}.fixture`;
}

type SessionCookies = { token?: string | null; without?: readonly string[]; override?: Record<string, string> };

/**
 * The `Cookie:` header of a session: the fixture cookies, with every `auth-token*` replaced by `token` (dropped
 * outright when it is `null` or absent — that is the "no session token" case), `without` names dropped, and `override`
 * names rewritten. Rewriting the organization/team cookies is the only way to present a tab whose cookies disagree with
 * its token, which is exactly what `tab-session.ts:56` compares.
 */
function sessionCookies(cookies: CookieComposer, options: SessionCookies = {}): string {
	const without = options.without ?? [];
	const override = options.override ?? {};
	const kept = cookies('A')
		.split('; ')
		.filter((entry) => {
			const name = entry.split('=')[0];
			return !name.startsWith('auth-token') && !without.includes(name);
		})
		.map((entry) => {
			const name = entry.split('=')[0];
			return name in override ? `${name}=${override[name]}` : entry;
		});
	return options.token ? [...kept, `auth-token=${options.token}`].join('; ') : kept.join('; ');
}

async function jsonOf(response: { json: () => Promise<unknown> }): Promise<Record<string, unknown> | null> {
	return (await response.json().catch(() => null)) as Record<string, unknown> | null;
}

/** The organization a granted token names (`helpers.ts:166-170` writes it into the payload). */
function organizationOf(token: unknown): unknown {
	if (typeof token !== 'string') return undefined;
	const part = token.split('.')[1];
	if (!part) return undefined;
	return (JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>).organizationId;
}

type ProbeAnswer = { status: number; body: Record<string, unknown> | null; headers: Record<string, string> };

async function answerOf(response: {
	status: () => number;
	json: () => Promise<unknown>;
	headers: () => Record<string, string>;
}): Promise<ProbeAnswer> {
	return { status: response.status(), body: await jsonOf(response), headers: response.headers() };
}

/** The write probe needs a JSON body to be a body at all (`forward-to-gauzy.ts:102-107`). */
async function writeProbe(
	api: ApiCall,
	ids: Record<string, string>,
	headers: Record<string, string>
): Promise<ProbeAnswer> {
	return answerOf(await api(WRITE, { method: 'POST', body: { organizationId: ids.organizationA }, headers }));
}

async function readProbe(api: ApiCall, headers: Record<string, string>): Promise<ProbeAnswer> {
	return answerOf(await api(READ, { headers }));
}

async function fileProbe(api: ApiCall, headers: Record<string, string>): Promise<ProbeAnswer> {
	return answerOf(await api(FILE, { headers }));
}

/** The three proxy call sites, with the mock path each one reaches. */
function probes(api: ApiCall, ids: Record<string, string>, headers: Record<string, string>) {
	return [
		{ path: READ, upstream: READ, call: () => readProbe(api, headers) },
		{ path: WRITE, upstream: WRITE, call: () => writeProbe(api, ids, headers) },
		{ path: FILE, upstream: FILE, call: () => fileProbe(api, headers) }
	];
}

/** `GET /api/user/me` runs `authenticatedGuard` (`app/api/user/me/route.ts:6`), the 3-argument call site. */
async function guardCall(
	api: ApiCall,
	cookie: string,
	extraHeaders: Record<string, string> = {}
): Promise<ProbeAnswer> {
	return answerOf(await api(ME, { headers: { cookie, ...extraHeaders } }));
}

test.describe('api · tab session on the proxy routes', () => {
	test.describe('what a proxy route sends upstream, per route', () => {
		test('the session cookie travels as a Bearer the mock can name, on all three call sites', async ({
			api,
			cookies,
			ids
		}) => {
			// `forward-to-gauzy.ts:92-95` reads the cookies (`request-cookies.ts:26-38`), finds no tab session, keeps the
			// cookie token, and `:118` writes it as the upstream `authorization`. The Cookie header itself is never
			// forwarded: `:114-120` sends the headers this proxy writes itself plus only the names a route lists at
			// `:110`, and `cookie`, `authorization`, `tenant-id` and `host` are blocked at `:11-19` in any case — which
			// is a reading of that code, not a measurement: the mock records no cookie at all (`:1052-1058`). What this
			// case measures is the half the mock can witness: the credential, per route.
			const sessionToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const cookie = sessionCookies(cookies, { token: sessionToken });

			for (const probe of probes(api, ids, { cookie })) {
				await mockReset(); // one call per probe, so the log names exactly that call (see the header)
				const { status, body } = await probe.call();
				expect(status, `${probe.path} answered ${status} to a signed-in caller: ${JSON.stringify(body)}`).toBe(
					200
				);
				expect(
					await receivedTokens(probe.upstream),
					`the token the mock received for ${probe.upstream} is not the session cookie's`
				).toEqual([sha256(sessionToken)]);
			}
		});

		test("the tenant cookie reaches the API as a header this proxy writes, and the caller's own header is dropped", async ({
			api,
			cookies,
			ids,
			mock
		}) => {
			// The mock grants `POST /auth/switch-organization` only for the organization of the `tenant-id` header it
			// received (`mock-gauzy-server.mjs:542-548`), and that header comes from the cookie alone
			// (`forward-to-gauzy.ts:97,119`): `forwardedHeaders` (`:37-45`) hands on only the names the route lists at
			// `:110`, and this route lists none (`app/api/auth/switch-organization/route.ts:8`).
			const granted = await writeProbe(api, ids, {});
			expect(
				granted.status,
				`the API refused the session's own organization: ${JSON.stringify(granted.body)}`
			).toBe(200);
			expect(
				organizationOf(granted.body?.token),
				'the granted token is not of the organization the cookie names'
			).toBe(ids.organizationA);

			// A caller that sends its own `tenant-id` header is not believed. Had it travelled, the mock would have
			// graded this request against tenant B and refused the organization of tenant A.
			const hostile = await writeProbe(api, ids, { 'tenant-id': ids.tenantB });
			expect(
				hostile.status,
				`a caller-supplied tenant-id header changed the answer to ${hostile.status}: it reached the API, which SESSION_HEADERS (forward-to-gauzy.ts:13) says it may not`
			).toBe(200);

			// And the gate is real, not a mock quirk: the same cookies asked for the other tenant's organization.
			const wrongOrganization = await answerOf(
				await api(WRITE, {
					method: 'POST',
					body: { organizationId: ids.organizationB },
					headers: { cookie: cookies('A') }
				})
			);
			expect(
				wrongOrganization.status,
				`the API granted an organization of another tenant: ${JSON.stringify(wrongOrganization.body)}`
			).toBe(401);
			expect(
				(await mock.calls(WRITE)).map((call) => `${call.method} ${call.status}`),
				'the API was not asked all three times'
			).toEqual(['POST 200', 'POST 200', 'POST 401']);
		});

		test('no proxy route reads or writes a cookie of its own, so no answer here can carry a tab-session cookie', async ({
			api,
			ids
		}) => {
			// There is no tab-session cookie to read: `constants.tsx:136-149` is the app's whole cookie set and names no
			// tab id. And these routes set nothing either — a proxy mode request hands the session on and answers with
			// the API's body only (`forward-to-gauzy.ts:128-131`, `forward-download-to-gauzy.ts:62`).
			for (const probe of probes(api, ids, {})) {
				const { headers } = await probe.call();
				expect(
					headers['set-cookie'] ?? '',
					`${probe.path} answered with Set-Cookie (${headers['set-cookie']}); a proxy route writes no cookie`
				).toBe('');
			}
		});

		test('a cross-site read keeps its session; a cross-site write is refused before the cookies are read', async ({
			api,
			cookies,
			ids,
			mock
		}) => {
			const sessionToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });

			// A GET is not a write: `refuseForeignWrite` returns null for GET and HEAD (`same-origin-request.ts:43-45`),
			// so the cookies a browser would attach cross-site are used exactly as usual.
			const read = await readProbe(api, {
				cookie: sessionCookies(cookies, { token: sessionToken }),
				origin: FOREIGN_ORIGIN
			});
			expect(read.status, `a cross-site read was answered ${read.status}, not with the session's answer`).toBe(
				200
			);
			expect(await receivedTokens(READ), 'a cross-site read did not carry the session token').toEqual([
				sha256(sessionToken)
			]);

			// A write from another site is refused here, before `requestCookies` is ever called
			// (`forward-to-gauzy.ts:89-92` → `same-origin-request.ts:16-34`). The read above did reach the API, so this
			// is proved on the write path alone.
			const written = await writeProbe(api, ids, {
				cookie: sessionCookies(cookies, { token: sessionToken }),
				origin: FOREIGN_ORIGIN
			});
			expect(written.status, `a cross-site write was not refused: ${JSON.stringify(written.body)}`).toBe(403);
			expect(written.body?.message, 'the refusal does not name its reason').toBe('Cross-site request refused');
			expect(written.headers['cache-control'], 'the refusal is cacheable').toBe('no-store');
			expect(await mock.calls(WRITE), 'a refused cross-site write reached the API').toEqual([]);

			// `Sec-Fetch-Site` refuses it on its own, with no Origin at all (`same-origin-request.ts:17-18`).
			const fetchSite = await writeProbe(api, ids, {
				cookie: sessionCookies(cookies, { token: sessionToken }),
				'sec-fetch-site': 'cross-site'
			});
			expect(fetchSite.status, 'a cross-site write announced only by Sec-Fetch-Site passed').toBe(403);
			expect(await mock.calls(WRITE), 'it reached the API').toEqual([]);
		});

		test('a proxy route hands on a bearer and a tenant header it writes itself, never the caller Cookie header', async ({
			api,
			ids,
			mock
		}) => {
			// The whole header set the upstream is asked with: `forward-to-gauzy.ts:112-120` is the headers a route named
			// at `:110` (via `forwardedHeaders`, `:37-45`, which refuses every name on `SESSION_HEADERS` at `:11-19` —
			// `cookie` among them) with this proxy own `Content-Type`, `Accept`, `authorization` and `tenant-id` spread
			// after them, so the caller `Cookie` header is not on its way and nothing a caller sends can replace the
			// session this proxy writes. `forward-download-to-gauzy.ts:41-49` is the same idea with no forwarded half at
			// all. The mock records method, path and status only (`mock-gauzy-server.mjs:1097`) and hashes a bearer only
			// (`:1052-1058`), so "no Cookie header upstream" is read off those two blocks; what is measured here is the
			// consequence the lane can see — the session a proxy route can send comes from the cookies it read *here*, so
			// a caller that brought none has nothing to forward, whatever Origin it names, and the origin gate runs
			// before the session check (`forward-to-gauzy.ts:89-96`).
			const crossRead = await api(READ, { anonymous: true, headers: { origin: FOREIGN_ORIGIN } });
			expect(crossRead.status(), `a cross-site read with no cookies answered ${crossRead.status()}`).toBe(401);
			expect((await jsonOf(crossRead))?.message, 'that 401 is not the one forwardToGauzy writes').toBe(
				'Unauthorized'
			);

			const ownRead = await api(READ, { anonymous: true, headers: { origin: APP_ORIGIN } });
			expect(ownRead.status(), `a same-origin read with no cookies answered ${ownRead.status()}`).toBe(401);

			// A write from another site is refused for its origin before it is refused for its missing session.
			const crossWrite = await api(WRITE, {
				anonymous: true,
				method: 'POST',
				body: { organizationId: ids.organizationA },
				headers: { origin: FOREIGN_ORIGIN }
			});
			expect(
				crossWrite.status(),
				`an anonymous cross-site write answered ${crossWrite.status()}, not the origin refusal`
			).toBe(403);

			expect(await mock.requests(), 'a call with no session cookie reached the API').toEqual([]);
			expect((await mock.state()).receivedTokens ?? [], 'a call with no session cookie sent a bearer').toEqual(
				[]
			);
		});

		test('the door in proxy.ts is not in front of /api: a sessionless call gets the route own 401', async ({
			api,
			mock
		}) => {
			// `proxy.ts:100` excludes `api` from its matcher, so none of its redirecting (`:175-185,519-522`) or token
			// refreshing (`:226-241`) is part of a /api answer: the caller gets the route's 401 JSON, not a 307 to the
			// sign-in page.
			const response = await api(READ, { anonymous: true, maxRedirects: 0 });
			expect(response.status(), `the answer was ${response.status()}, not the route's 401`).toBe(401);
			expect(response.url(), `the answer came from ${response.url()}, not from ${READ}`).toContain(READ);
			expect((await jsonOf(response))?.message, 'the 401 is not the one forwardToGauzy writes').toBe(
				'Unauthorized'
			);
			expect(await mock.requests(), 'a sessionless proxy call reached the API').toEqual([]);
			expect((await mock.state()).receivedTokens ?? [], 'a sessionless proxy call sent a token').toEqual([]);
		});
	});

	test.describe('api · tab session — is a second tab session treated as a different session', () => {
		test('a bearer of the same person naming another organization replaces the cookie token on all three call sites', async ({
			api,
			cookies,
			ids
		}) => {
			// `tab-session.ts:44-55,58`: same `id ?? sub`, same `tenantId` (both absent — the fixture token carries no
			// `tenantId` claim, `helpers.ts:166-170`, so a same-tenant tab token must not name one either), another
			// `organizationId` → the tab token is what gets forwarded. The cookies still name organization A, and on a
			// proxy route that is ignored: `forward-to-gauzy.ts:92-97` reads the token cookie and the tenant cookie only.
			const cookieToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const tabToken = tokenWith({ sub: ids.user, organizationId: ids.organizationB });
			const cookie = sessionCookies(cookies, { token: cookieToken });

			for (const probe of probes(api, ids, { cookie, authorization: `Bearer ${tabToken}` })) {
				await mockReset();
				const { status, body } = await probe.call();
				expect(status, `${probe.path} answered ${status} to a tab bearer: ${JSON.stringify(body)}`).toBe(200);
				const received = await receivedTokens(probe.upstream);
				expect(
					received,
					`${probe.upstream} did not forward the tab bearer — isOtherThanSession (tab-session.ts:55) was not reached`
				).toEqual([sha256(tabToken)]);
				expect(received, `${probe.upstream} forwarded the cookie token as well`).not.toContain(
					sha256(cookieToken)
				);
			}
		});

		test('x-tab-team-id changes nothing on a proxy route, whatever shape it has', async ({ api, cookies, ids }) => {
			// The team header is the whole trigger of `isOtherThanCookie` (`tab-session.ts:39-42,56`), and that branch is
			// never reached from here: `forward-to-gauzy.ts:95` and `forward-download-to-gauzy.ts:39` pass two arguments,
			// so `sharedOrganizationId` is undefined. Measured: the credential the mock received is the session own in
			// every shape of the header — valid, malformed by `TEAM_ID_PATTERN` (`:5`), 65 characters, or empty.
			const sessionToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const cookie = sessionCookies(cookies, {
				token: sessionToken,
				override: { 'auth-organization-id': ids.organizationB }
			});

			for (const header of [
				{ name: 'a team named', value: ids.teamB },
				{ name: 'a malformed team id (a slash and a space)', value: 'not a team/ok' },
				{ name: 'a team id of 65 characters', value: 'x'.repeat(65) },
				{ name: 'an empty team id', value: '' }
			]) {
				await mockReset();
				const { status } = await readProbe(api, {
					cookie,
					authorization: `Bearer ${sessionToken}`,
					'x-tab-team-id': header.value
				});
				expect(status, `${header.name}: ${READ} answered ${status}`).toBe(200);
				expect(
					await receivedTokens(READ),
					`${header.name}: the credential that left the app changed, although tab-session.ts:56 needs the organization cookie a proxy route never passes it`
				).toEqual([sha256(sessionToken)]);
			}
		});

		test('the exact trigger of isOtherThanCookie still acts in the cookie tenant organization on a proxy route', async ({
			api,
			cookies,
			ids
		}) => {
			// Everything `tab-session.ts:56` asks for, in the shape #5134 describes: a tab whose own token is in
			// `authorization`, its team named in `x-tab-team-id`, and the shared organization cookie switched to another
			// organization than that token names. On the guard route this combination is a tab session
			// (`authenticated-guard-app.ts:66-69`). Here `isOtherThanSession` is false for the caller own token (`:55`, it
			// names its own organization) and `isOtherThanCookie` was never handed the cookie to compare with
			// (`forward-to-gauzy.ts:95`), so `:57` returns null and the request acts with the cookies — proved by what the
			// mock granted: the organization of the cookie tenant, not the one the tab named.
			const ownToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const { status, body } = await writeProbe(api, ids, {
				cookie: sessionCookies(cookies, {
					token: ownToken,
					override: { 'auth-organization-id': ids.organizationB }
				}),
				authorization: `Bearer ${ownToken}`,
				['x-tab-team-id']: ids.teamB
			});
			expect(status, `the tab-flavoured write answered ${status}: ${JSON.stringify(body)}`).toBe(200);
			expect(
				organizationOf(body?.token),
				'the request acted in another organization than the cookie tenant grants'
			).toBe(ids.organizationA);
			expect(await receivedTokens(WRITE), 'the token forwarded is not the session token').toEqual([
				sha256(ownToken)
			]);
		});

		test('a second token of the cookies own organization is not a second session on a proxy route either', async ({
			api,
			cookies,
			ids
		}) => {
			// The other half of `:55-57`: a *distinct* token (so `:43` does not return early) of the same person, the same
			// absent tenant, and the organization the cookies already name — with the team header around it.
			// `isOtherThanSession` is false, `isOtherThanCookie` has no cookie to be other than, so `:57` refuses the tab
			// session and `:95` keeps the cookie token.
			const sessionToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const secondTokenOfTheSameOrganization = tokenWith({ sub: ids.user, organizationId: ids.organizationA });

			const { status } = await readProbe(api, {
				cookie: sessionCookies(cookies, { token: sessionToken }),
				authorization: `Bearer ${secondTokenOfTheSameOrganization}`,
				['x-tab-team-id']: ids.teamB
			});
			expect(status, `a second token of the cookies own organization: ${READ} answered ${status}`).toBe(200);
			expect(
				await receivedTokens(READ),
				'a token of the organization the cookies already name replaced the cookie token'
			).toEqual([sha256(sessionToken)]);
		});

		test('the organization and team cookies are not even read on a proxy route', async ({ api, cookies, ids }) => {
			// Drop the two cookies a tab session would be compared with and the answer does not change:
			// `forward-to-gauzy.ts:92-97` reads the token cookie and the tenant cookie only.
			const cookieToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const tabToken = tokenWith({ sub: ids.user, organizationId: ids.organizationB });

			const { status, body } = await writeProbe(api, ids, {
				cookie: sessionCookies(cookies, {
					token: cookieToken,
					without: ['auth-organization-id', 'auth-active-team']
				}),
				authorization: `Bearer ${tabToken}`
			});
			expect(
				status,
				`a request without the organization/team cookies answered ${status}: ${JSON.stringify(body)}`
			).toBe(200);
			expect(await receivedTokens(WRITE), 'the cookie set decided which token travelled').toEqual([
				sha256(tabToken)
			]);
		});

		test('a bearer of another person, or of another tenant, never replaces the session token', async ({
			api,
			cookies,
			ids
		}) => {
			// `tab-session.ts:47-52`: the tab token must name the same `id ?? sub` and the same `tenantId` as the cookie
			// token. The session token here names no tenant, so each case differs in exactly one of the two.
			const sessionToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const cookie = sessionCookies(cookies, { token: sessionToken });

			const cases: Array<[string, string]> = [
				[
					'another person token of another organization',
					tokenWith({ sub: '11111111-1111-4111-8111-111111111111', organizationId: ids.organizationB })
				],
				[
					'the same person token of another tenant',
					tokenWith({ sub: ids.user, tenantId: ids.tenantB, organizationId: ids.organizationB })
				]
			];
			for (const [what, token] of cases) {
				await mockReset();
				const { status } = await readProbe(api, {
					cookie,
					authorization: `Bearer ${token}`,
					'x-tab-team-id': ids.teamB
				});
				expect(status, `${what}: ${READ} answered ${status}`).toBe(200);
				expect(
					await receivedTokens(READ),
					`${what} replaced the session token — isSameSession (tab-session.ts:47-52) accepted it`
				).toEqual([sha256(sessionToken)]);
			}
		});

		test('no bearer, an empty bearer, another scheme and a non-token bearer are all left alone', async ({
			api,
			cookies,
			ids
		}) => {
			const sessionToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const cookie = sessionCookies(cookies, { token: sessionToken });

			const cases: Array<[string, Record<string, string>]> = [
				['no authorization header at all', {}],
				['x-tab-team-id with no bearer', { 'x-tab-team-id': 'team-that-does-not-matter' }],
				['an empty Bearer', { authorization: 'Bearer ' }],
				[
					'an empty Bearer with a team named',
					{ authorization: 'Bearer ', 'x-tab-team-id': 'team-that-does-not-matter' }
				],
				['another scheme', { authorization: 'Token abcdef' }],
				[
					'a Bearer that is not a JWT',
					{ authorization: 'Bearer not-a-jwt', 'x-tab-team-id': 'team-that-does-not-matter' }
				]
			];
			for (const [what, headers] of cases) {
				await mockReset();
				const { status } = await readProbe(api, { cookie, ...headers });
				expect(status, `${what}: ${READ} answered ${status}`).toBe(200);
				expect(
					await receivedTokens(READ),
					`${what} changed the token that left the app, although tab-session.ts:36-45 refuses all of these`
				).toEqual([sha256(sessionToken)]);
			}
		});
	});

	test.describe('api · tab session — the 3-argument caller, and what a lane cannot see of it', () => {
		test('the guard replaces the cookie token the same way (authenticated-guard-app.ts:66-67)', async ({
			api,
			cookies,
			ids
		}) => {
			// Here the third argument is a real string (`:64-66`), and a tab bearer naming another organization reaches the
			// API as the bearer of the session check (`authenticated-guard-app.ts:67,76`). Unique mints: this guard shares
			// one session check per bearer for 5 s (`:29-31,79-81`), so a cached check would hide a call the mock answered.
			const cookieToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const tabToken = tokenWith({ sub: ids.user, organizationId: ids.organizationB });

			const { status, body } = await guardCall(api, sessionCookies(cookies, { token: cookieToken }), {
				authorization: `Bearer ${tabToken}`
			});
			expect(status, `GET ${ME} answered ${status} to a tab bearer: ${JSON.stringify(body)}`).toBe(200);
			expect(
				await receivedTokens(ME),
				'the guard checked the session with the cookie token rather than the tab token'
			).toEqual([sha256(tabToken)]);
		});

		test('…and the cookie half of the branch has no witness a lane can read', async ({ api, cookies, ids }) => {
			// `isOtherThanCookie` *is* computed on this route, and it does change something —
			// `authenticated-guard-app.ts:68-72` takes the tab session organization and team and drops the task and
			// project cookies. What it never changes is the credential: the tab token here is the caller own token, so
			// `receivedTokens` cannot tell the two requests apart, and the mock logs method, path and status only
			// (`mock-gauzy-server.mjs:1097`) while the guard ids travel in the query string
			// (`requests/organization-team.ts:119`, `requests/organization-team-employee.ts:20`) or in a body the guard
			// does not fill. Pinned: the same credential either way. **Not answerable in a lane: which organization, team,
			// task and project ids the guard handed the route** — that half needs a browser lane, or a mock that records
			// the query it was given.
			const ownToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const cookie = sessionCookies(cookies, {
				token: ownToken,
				override: { 'auth-organization-id': ids.organizationB, 'auth-active-team': ids.teamB }
			});

			const withoutTeam = await guardCall(api, cookie, {});
			expect(withoutTeam.status, `GET ${ME} without a team header: ${withoutTeam.status}`).toBe(200);
			const withTeam = await guardCall(api, cookie, { 'x-tab-team-id': ids.teamB });
			expect(withTeam.status, `GET ${ME} with a team header: ${withTeam.status}`).toBe(200);

			const received = await receivedTokens(ME);
			expect(
				received.length,
				`the session was checked ${received.length} times, not at least once`
			).toBeGreaterThan(0);
			expect(
				[...new Set(received)],
				'a team header changed the credential the guard checked the session with — it may only change the ids the route acts with'
			).toEqual([sha256(ownToken)]);
		});
	});

	test.describe('api · tab session — no session cookie, or a broken one', () => {
		test('a bearer alone authenticates nothing: 401 here, on all three call sites, and the API was never asked', async ({
			api,
			ids,
			mock
		}) => {
			// `tab-session.ts:38` returns null when there is no `sharedToken`, whatever the header says, and
			// `forward-to-gauzy.ts:96` (with `forward-download-to-gauzy.ts:40` for the file route) answers 401 without
			// contacting the API.
			const tabToken = tokenWith({ sub: ids.user, organizationId: ids.organizationB });
			const headers = { authorization: `Bearer ${tabToken}`, 'x-tab-team-id': ids.teamB };

			const read = await api(READ, { anonymous: true, headers });
			expect(read.status(), `a bearer-only read answered ${read.status()}`).toBe(401);
			const written = await api(WRITE, {
				anonymous: true,
				method: 'POST',
				body: { organizationId: ids.organizationA },
				headers
			});
			expect(written.status(), `a bearer-only write answered ${written.status()}`).toBe(401);
			const file = await api(FILE, { anonymous: true, headers });
			expect(file.status(), `a bearer-only file read answered ${file.status()}`).toBe(401);

			expect(await mock.requests(), 'a sessionless proxy call reached the API').toEqual([]);
			expect((await mock.state()).receivedTokens ?? [], 'a sessionless proxy call sent a bearer').toEqual([]);
		});

		test('a session with no auth-token cookie is refused here, and one chunk short is refused too', async ({
			api,
			cookies,
			ids,
			mock
		}) => {
			// `sessionCookies` without a `token` is the cookie set of a session that has lost its access token.
			const noToken = sessionCookies(cookies);
			const missing = await readProbe(api, { cookie: noToken });
			expect(missing.status, 'a cookie set without auth-token was answered by the API').toBe(401);
			expect(await mock.requests(), 'it reached the API').toEqual([]);

			// `requestAccessToken` (`request-cookies.ts:26-37`) refuses a chunked token it cannot complete, so there is no
			// token for `tabSessionOf` to compare a bearer with (`tab-session.ts:38`).
			const tabToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const partial = await readProbe(api, {
				cookie: `${noToken}; auth-token_totalChunks=3; auth-token0=aa; auth-token1=bb`,
				authorization: `Bearer ${tabToken}`
			});
			expect(partial.status, 'a session missing an announced chunk was answered by the API').toBe(401);
			expect(await mock.requests(), 'a partial token reached the API').toEqual([]);
		});

		test('a session cookie that is not a JWT travels upstream as it is, and a good bearer cannot rescue it', async ({
			api,
			cookies,
			ids
		}) => {
			// `sharedToken` only has to exist (`tab-session.ts:38`); its decode is what a bearer is compared with
			// (`:45,47-52`). A cookie the decoder rejects makes `shared` null, so `isSameSession` fails (`:48`) and the
			// fallback at `forward-to-gauzy.ts:95` keeps the broken cookie. Neither this proxy nor the mock validates a
			// token (`mock-gauzy-server.mjs:1052-1058`), so a garbage session reaches the API.
			const garbage = 'not-a-jwt-at-all';
			const goodTabToken = tokenWith({ sub: ids.user, organizationId: ids.organizationB });

			const { status } = await readProbe(api, {
				cookie: sessionCookies(cookies, { token: garbage }),
				authorization: `Bearer ${goodTabToken}`
			});
			expect(status, `a garbage session cookie was answered ${status} instead of being refused here`).toBe(200);
			const received = await receivedTokens(READ);
			expect(received, 'the garbage token was not what the API received').toEqual([sha256(garbage)]);
			expect(received, 'the good bearer replaced the broken session token').not.toContain(sha256(goodTabToken));
		});

		test('a bearer whose claims decode to nothing is left alone, so the session answers', async ({
			api,
			cookies,
			ids
		}) => {
			// `decodeJWT` requires numeric `iat` and `exp` (`jwt-utils.ts:51-54`): a three-part token without them decodes
			// to null, `tab-session.ts:44,48` refuses it, and the cookies answer.
			const sessionToken = tokenWith({ sub: ids.user, organizationId: ids.organizationA });
			const withoutDates = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: ids.user, organizationId: ids.organizationB })}.fixture`;

			const { status } = await readProbe(api, {
				cookie: sessionCookies(cookies, { token: sessionToken }),
				authorization: `Bearer ${withoutDates}`,
				['x-tab-team-id']: ids.teamB
			});
			expect(status, `a claim-less bearer broke the session: ${status}`).toBe(200);
			expect(await receivedTokens(READ), 'a bearer that decodes to nothing replaced the session token').toEqual([
				sha256(sessionToken)
			]);
		});
	});
});
