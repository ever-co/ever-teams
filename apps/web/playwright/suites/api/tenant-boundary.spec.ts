import { expect, test, type ApiCall } from '../../api-fixtures';

/**
 * A session may only act inside its own tenant.
 *
 * `POST /api/auth/switch-organization` is the one proxied route that hands out tokens for a different
 * organization, so it is where a tenant-boundary mistake would show up: it takes an `organizationId` from
 * the request body, and the answer is a pair of tokens. Gauzy grants it only for an organization of the
 * tenant the request itself is authenticated as, and the test backend answers the same way
 * (`cypress/support/mock-gauzy-server.mjs`, the `switch-organization` branch) — on the `tenant-id`
 * HEADER only, so a `tenantId` in the query cannot widen it either.
 *
 * The app writes that header itself, from the session's `auth-tenant-id` cookie, and refuses to let the
 * caller's own copy of it through (`core/services/server/forward-to-gauzy.ts`, SESSION_HEADERS). Most
 * cases below are therefore proved by the status: a granted switch would be a 200 with tokens, so a 401
 * says the boundary held, and a 200 where a 401 is expected says it did not.
 */

const SWITCH = '/api/auth/switch-organization';
/** Not in the fixture, and not in any tenant: what a made-up id looks like to the API. */
const UNKNOWN_ORGANIZATION = '99999999-9999-4999-8999-999999999999';

/** The mock's token is an unsigned three-part JWT; its claims are what a switch actually granted. */
function claimsOf(token: string): Record<string, unknown> {
	const part = token.split('.')[1];
	return part ? (JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>) : {};
}

/** What a refusal looks like: a status and a message, and no token anywhere in it. */
function expectRefusedWithoutTokens(status: number, body: Record<string, unknown>, why: string) {
	expect(status, `${why}: answered ${JSON.stringify(body)}`).toBe(401);
	expect(body.token, `${why}: a refusal must not carry an access token`).toBeUndefined();
	expect(body.refresh_token, `${why}: a refusal must not carry a refresh token`).toBeUndefined();
}

async function switchTo(
	api: ApiCall,
	organizationId: string | undefined,
	options: { scope?: 'A' | 'B'; anonymous?: boolean; headers?: Record<string, string>; query?: string } = {}
) {
	const response = await api(`${SWITCH}${options.query ?? ''}`, {
		method: 'POST',
		body: organizationId === undefined ? {} : { organizationId },
		scope: options.scope,
		anonymous: options.anonymous,
		headers: options.headers
	});
	const text = await response.text();
	let body: Record<string, unknown> = {};
	try {
		body = JSON.parse(text) as Record<string, unknown>;
	} catch {
		body = { unparsed: text.slice(0, 300) };
	}
	return { response, body, why: `switch to ${organizationId ?? '<no organizationId>'} ${options.scope ?? 'A'}` };
}

test.describe('switching organization stays inside the session tenant', () => {
	test('an organization of the session tenant gets new tokens for it', async ({ api, ids, mock }) => {
		const { response, body, why } = await switchTo(api, ids.organizationA, { scope: 'A' });

		expect(response.status(), `${why}: answered ${JSON.stringify(body)}`).toBe(200);
		expect(typeof body.token, `${why}: no access token in ${JSON.stringify(body)}`).toBe('string');
		expect(body.refresh_token, `${why}: no refresh token in ${JSON.stringify(body)}`).toBe(
			'synthetic-refresh-token'
		);

		// The token is only worth what its claims say: the same person, the organization asked for.
		const claims = claimsOf(String(body.token));
		expect(claims.sub, `${why}: the token is not the session user's`).toBe(ids.user);
		expect(claims.organizationId, `${why}: the token is not of the organization asked for`).toBe(
			ids.organizationA
		);

		const calls = await mock.calls('/api/auth/switch-organization');
		expect(calls.map((call) => `${call.method} ${call.path} ${call.status}`), `${why}: the API was not asked`).toEqual([
			'POST /api/auth/switch-organization 200'
		]);
	});

	test('the other tenant of the same person is refused', async ({ api, ids }) => {
		// The same user does hold a workspace in tenant B, and its organization id is a real id of the
		// fixture — a session of tenant A still may not buy tokens for it.
		const { response, body, why } = await switchTo(api, ids.organizationB, { scope: 'A' });
		expectRefusedWithoutTokens(response.status(), body, `${why}: a session of tenant A`);
	});

	test('the second tenant switches inside its own tenant, and not into the first', async ({ api, ids }) => {
		const own = await switchTo(api, ids.organizationB, { scope: 'B' });
		expect(own.response.status(), `${own.why}: answered ${JSON.stringify(own.body)}`).toBe(200);
		expect(claimsOf(String(own.body.token)).organizationId, `${own.why}: wrong organization granted`).toBe(
			ids.organizationB
		);

		const foreign = await switchTo(api, ids.organizationA, { scope: 'B' });
		expectRefusedWithoutTokens(foreign.response.status(), foreign.body, `${foreign.why}: a session of tenant B`);
	});

	test('an organization id that belongs to nobody is refused', async ({ api }) => {
		const { response, body, why } = await switchTo(api, UNKNOWN_ORGANIZATION, { scope: 'A' });
		expectRefusedWithoutTokens(response.status(), body, why);
	});

	test('a switch with no organization asked for is refused', async ({ api }) => {
		const { response, body, why } = await switchTo(api, undefined, { scope: 'A' });
		expectRefusedWithoutTokens(response.status(), body, `${why}: an empty body`);
	});

	test('a tenantId in the query does not authorize another tenant', async ({ api, ids, mock }) => {
		// The route forwards the query string as it is. The mock answers this switch on the tenant-id
		// header alone, so the query the app forwarded must not be what the switch is authorized on.
		const { response, body, why } = await switchTo(api, ids.organizationB, {
			scope: 'A',
			query: `?tenantId=${ids.tenantB}`
		});
		expectRefusedWithoutTokens(response.status(), body, `${why}: via the query string`);

		const calls = await mock.calls('/api/auth/switch-organization');
		expect(calls.length, `${why}: the API was not asked at all`).toBe(1);
		expect(calls[0].query, `${why}: the forwarded query is not what the test sent`).toContain(ids.tenantB);
	});

	test("a caller's own tenant-id header does not replace the session's tenant", async ({ api, ids }) => {
		// forwardToGauzy lists tenant-id among the headers it writes itself, so this header never reaches
		// the API: had it been honored, tenant B's organization would have been granted with tenant A's
		// session, and this test would be looking at a 200 with tokens.
		const { response, body, why } = await switchTo(api, ids.organizationB, {
			scope: 'A',
			headers: { 'tenant-id': ids.tenantB }
		});
		expectRefusedWithoutTokens(response.status(), body, `${why}: via a header the caller brought`);
	});

	test('a session whose cookies name no tenant is granted nothing', async ({ api, ids, cookies, mock }) => {
		const { response, body, why } = await switchTo(api, ids.organizationA, {
			headers: { cookie: cookies('A', ['auth-tenant-id']) }
		});

		expectRefusedWithoutTokens(response.status(), body, `${why}: cookies without auth-tenant-id`);
		// Unlike the anonymous case below, this request did reach the API and was refused there: the
		// proxy had a token to send, it just could not say which tenant acts with it.
		const calls = await mock.calls('/api/auth/switch-organization');
		expect(calls.map((call) => call.status), `${why}: the API never saw this request`).toEqual([401]);
	});

	test('a request with no session is refused before anything is asked of the API', async ({ api, mock }) => {
		const { response, body, why } = await switchTo(api, ids_call(), { anonymous: true });

		expect(response.status(), `${why}: answered ${JSON.stringify(body)}`).toBe(401);
		// The proxy has no token to forward, so it answers without touching the API at all: the mock log
		// is empty because the refusal came first, not because the API refused.
		expect(await mock.requests(), `${why}: the API was asked anyway`).toEqual([]);
	});

	test('a cross-site switch is refused before anything is asked of the API', async ({ api, mock }) => {
		// The proxy guard (`refuseForeignWrite` inside forwardToGauzy), which no route file names itself.
		const { response, body, why } = await switchTo(api, 'any', {
			headers: { origin: 'https://some-other-site.example' }
		});

		expect(`${response.status()} ${JSON.stringify(body)}`, `${why}: not refused as cross-site`).toMatch(/403/);
		expect(await mock.requests(), `${why}: the API was asked anyway`).toEqual([]);
	});

	test('the switch cannot be read with a GET', async ({ api, ids, mock }) => {
		// The cross-site guard exempts GET and HEAD, and this route answers 405 for them: a read must not
		// be able to mint tokens either.
		const response = await api(`${SWITCH}?organizationId=${ids.organizationA}`, { method: 'GET' });
		expect(response.status(), 'a GET on the organization switch answered with tokens').not.toBe(200);
		expect(await mock.requests(), 'the API was asked to switch by a GET').toEqual([]);
	});
});

/** A body value that is not a fixture id: this case is only about having no session at all. */
function ids_call(): string {
	return UNKNOWN_ORGANIZATION;
}
