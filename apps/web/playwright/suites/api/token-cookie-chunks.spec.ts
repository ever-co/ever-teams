import { createHash } from 'node:crypto';

import { expect, test, type ApiCall, type CookieComposer } from '../../api-fixtures';
import { receivedTokens } from '../../helpers';

/** What the mock records of a token it received (`receivedTokens`): the same hash of the token the session holds. */
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * A long access token reaches the server as several cookies, and the server has to put it back together.
 *
 * The sign-in writes `auth-token0`, `auth-token1`, … with `auth-token_totalChunks` when the token does not
 * fit one cookie (a chunk holds ~4 KB and a Gauzy token with its team list can exceed that).
 * `core/services/server/request-cookies.ts` `requestAccessToken` is what reads them back: the chunks joined
 * in order, or `auth-token` when the announced count is not a count a sign-in writes
 * (`core/lib/helpers/cookies/token-chunks.ts`, which refuses anything outside 1..64 because the value comes
 * from the client and once let one anonymous request allocate gigabytes). Every proxied route takes its
 * `Bearer` token from there, so a mistake in that one function signs people out of the whole app — or sends
 * half a token upstream.
 *
 * `POST /api/auth/switch-organization` is the probe: 200 with tokens only when the request reached the API
 * with a token and the session's own tenant, 401 otherwise, and 401 here (with an empty mock log) when the
 * app had no token to send at all. So "was the token whole when it left the app" reads off the status, and
 * "did it leave at all" reads off the mock's request log.
 */

const SWITCH = '/api/auth/switch-organization';

function tokenOf(cookies: CookieComposer, scope: 'A' | 'B' = 'A'): string {
	const pair = cookies(scope)
		.split('; ')
		.find((entry) => entry.startsWith('auth-token='));
	if (!pair) throw new Error('the fixture session cookie set carries no auth-token to split');
	return pair.slice('auth-token='.length);
}

/** The session's cookies with the token stored in `parts` pieces and no `auth-token` cookie, optionally
 * announcing a different number of pieces than there are. */
function chunked(
	cookies: CookieComposer,
	scope: 'A' | 'B',
	token: string,
	parts: number,
	declaredTotal = parts,
	withLastChunk = true
): string {
	const size = Math.ceil(token.length / parts);
	const others = cookies(scope)
		.split('; ')
		.filter((entry) => !entry.startsWith('auth-token'));
	const written = withLastChunk ? parts : parts - 1;
	const chunks = Array.from({ length: written }, (_unused, index) => {
		const piece = token.slice(index * size, (index + 1) * size);
		return `auth-token${index}=${piece}`;
	});
	return [...others, `auth-token_totalChunks=${declaredTotal}`, ...chunks].join('; ');
}

async function switchOrganization(api: ApiCall, cookie: string, organizationId: string) {
	const response = await api(SWITCH, { method: 'POST', body: { organizationId }, headers: { cookie } });
	const text = await response.text();
	return { status: response.status(), text };
}

function organizationOf(token: string): unknown {
	const part = token.split('.')[1];
	if (!part) return undefined;
	return (JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>).organizationId;
}

test.describe('the access token cookie, split or whole', () => {
	test('a token stored in three chunks is sent whole', async ({ api, cookies, ids, mock }) => {
		const token = tokenOf(cookies);
		const { status, text } = await switchOrganization(api, chunked(cookies, 'A', token, 3), ids.organizationA);

		// No `auth-token` cookie in that header: reassembly is the only way this can succeed.
		expect(status, `the app could not reassemble its chunked token: ${text}`).toBe(200);
		const body = JSON.parse(text) as { token?: string };
		expect(typeof body.token, `the answer carries no access token: ${text}`).toBe('string');
		expect(organizationOf(String(body.token)), 'the granted token is of another organization').toBe(
			ids.organizationA
		);

		const calls = await mock.calls('/api/auth/switch-organization');
		expect(calls.map((c) => c.status)).toEqual([200]);
		// The mock answers any token, so the status alone cannot show the reassembly kept every byte: the hash can.
		expect(await receivedTokens(SWITCH), 'the API received a different token than the one that was split').toEqual([
			sha256(token)
		]);
	});

	test('a chunk that is missing is refused here instead of sending half a token', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		const token = tokenOf(cookies);
		const header = chunked(cookies, 'A', token, 3, 3, false); // announces three, writes two

		const { status, text } = await switchOrganization(api, header, ids.organizationA);

		expect(status, `a session missing an announced chunk was not refused: ${text}`).toBe(401);
		expect(await mock.requests(), 'a partial token was forwarded to the API').toEqual([]);
	});

	test('a chunk count that is not a count leaves the plain cookie in charge', async ({ api, cookies, ids }) => {
		const { status, text } = await switchOrganization(
			api,
			`${cookies('A')}; auth-token_totalChunks=not-a-number`,
			ids.organizationA
		);

		expect(status, `a nonsense chunk count broke a session that has a plain auth-token: ${text}`).toBe(200);
	});

	test('a chunk count of zero is not a chunked token either', async ({ api, cookies, ids }) => {
		const { status, text } = await switchOrganization(
			api,
			`${cookies('A')}; auth-token_totalChunks=0`,
			ids.organizationA
		);

		expect(status, `auth-token_totalChunks=0 broke a plain session: ${text}`).toBe(200);
	});

	test('an enormous chunk count is refused at once, without sizing a loop', async ({ api, ids, mock }) => {
		// `auth-token_totalChunks` is a client-supplied number: it must never size a read loop. An earlier
		// version let 100000000 make one anonymous request block the server for seconds and allocate gigabytes.
		const startedAt = Date.now();
		const { status, text } = await switchOrganization(
			api,
			`auth-token_totalChunks=100000000; auth-token0=${'x'.repeat(4000)}; tenant-id=x`,
			ids.organizationA
		);
		const tookMs = Date.now() - startedAt;

		expect(status, `the enormous count was not refused outright: ${text}`).toBe(401);
		expect(tookMs, `the answer took ${tookMs} ms: the count was used as a loop size`).toBeLessThan(5_000);
		expect(await mock.requests(), 'the request reached the API anyway').toEqual([]);
	});

	test('a session with no token cookie at all is refused here, not upstream', async ({ api, cookies, ids, mock }) => {
		const { status, text } = await switchOrganization(api, cookies('A', ['auth-token']), ids.organizationA);

		expect(status, `a session without a token was answered by the API instead: ${text}`).toBe(401);
		expect(await mock.requests(), 'a session without a token reached the API').toEqual([]);
	});

	test('the second tenant is read the same way, with its own token', async ({ api, cookies, ids }) => {
		const token = tokenOf(cookies, 'B');
		const { status, text } = await switchOrganization(api, chunked(cookies, 'B', token, 2), ids.organizationB);

		expect(status, `scope B with a chunked token: ${text}`).toBe(200);
		const body = JSON.parse(text) as { token?: string };
		expect(organizationOf(String(body.token)), `the granted organization is not scope B's: ${text}`).toBe(
			ids.organizationB
		);
		expect(await receivedTokens(SWITCH), 'the API received a different token than scope B holds').toEqual([
			sha256(token)
		]);
	});
});
