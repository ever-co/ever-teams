import { expect, test, type ApiCall } from '../../api-fixtures';
import { everIdLogouts, idpLogoutToken, idpState, mockReset, mockScenario } from '../../helpers';

/**
 * `POST /api/auth/ever-id/backchannel-logout`: the OpenID Connect back-channel logout of the Ever ID sign-in.
 *
 * The identity provider posts a logout token here when the person signs out there. This app must check it
 * against the issuer's own published keys and the claims a logout token is required to carry
 * (core/lib/auth/ever-id/logout-token.ts), then hand it to the API, which revokes the refresh tokens of the
 * sessions that sign-in opened. Everything that follows is the *route's* contract, over real HTTP, against a
 * fake issuer that signs for real (apps/web/playwright/ever-id-idp.mjs) and the mock API:
 *
 * - 404 while the sign-in is not configured (that is the api suite's case: suites/api/ever-id-off.spec.ts);
 * - 400 for anything that is not a form-encoded, valid, fresh, never-seen logout token for this app;
 * - 503 when the answer cannot be trusted yet — the issuer's keys could not be checked, the API could not be
 *   reached, limited the request or failed — and the token is then forgotten here, so the provider can send it
 *   again;
 * - 200 for a token the API accepted, and for one the API refused (a refusal does not improve on a retry).
 *
 * There is no same-origin guard on this route and that is deliberate: the credential is the signed token, not
 * this app's cookies, and the sender is a third-party server. A test below pins that, so widening it to a
 * cookie-authenticated action would be noticed.
 */

const ROUTE = '/api/auth/ever-id/backchannel-logout';

/** The provider's own POST: form-encoded, exactly as Back-Channel Logout 1.0 sends it. */
async function post(api: ApiCall, logoutToken: string, headers: Record<string, string> = {}) {
	const response = await api(ROUTE, {
		method: 'POST',
		body: new URLSearchParams({ logout_token: logoutToken }).toString(),
		anonymous: true,
		headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers }
	});
	return { status: response.status(), body: await response.text(), headers: response.headers() };
}

const logouts = () => everIdLogouts();
/**
 * An empty mock request log and an empty issuer contact log, so that "the API was asked once" and "the issuer
 * was never contacted" mean this test's traffic and nothing another test left behind. A minted token's jti
 * stays unique across a run, so a reset can never turn one token into another's replay.
 */
const cleanSlate = () => mockReset();
const askedTheIssuer = async () => (await idpState()).contacts.length;

test.describe('the Ever ID back-channel logout', () => {
	test('a logout token the issuer signed reaches the API as it arrived, and only that token', async ({ api }) => {
		await cleanSlate();
		const minted = await idpLogoutToken();

		const answer = await post(api, minted.token);
		expect(answer.status, `the route answered ${answer.status} to a valid logout token (${answer.body})`).toBe(200);

		const seen = await logouts();
		expect(seen, 'the API was not told to end the sessions').toHaveLength(1);
		expect(seen[0].tokenSha256, 'a different token reached the API than the one the provider signed').toBe(minted.sha256);
		expect(seen[0].contentType, 'the token was not forwarded the way the provider posted it').toContain(
			'application/x-www-form-urlencoded'
		);
	});

	test('the signature is what is trusted: a token naming the issuer’s published key but not signed by it', async ({
		api
	}) => {
		await cleanSlate();
		// Claims that are perfect in every way, signed with the key the issuer keeps to itself while the header
		// names the published one. A verifier that checked only the claims would accept this and end somebody's
		// sessions; a verifier that resolves the key by `kid` and checks the signature does not.
		const forged = await idpLogoutToken({ kid: 'playwright-ever-id-rotated-out', headerKid: 'playwright-ever-id-key' });

		const answer = await post(api, forged.token);
		expect(answer.status, `a token with a signature the published key does not match answered ${answer.status}`).toBe(400);
		expect(await logouts(), 'the API was told to end sessions on a forged signature').toEqual([]);
	});

	test('a replayed token is refused here, before it can reach the API again', async ({ api }) => {
		await cleanSlate();
		const minted = await idpLogoutToken();

		const first = await post(api, minted.token);
		expect(first.status, 'the first delivery was refused').toBe(200);

		const replay = await post(api, minted.token);
		expect(replay.status, 'the same token was accepted twice').toBe(400);
		const seen = await logouts();
		expect(seen, `the API was asked ${seen.length} times for one logout token`).toHaveLength(1);
	});

	test('a logout token addressed to another client is refused', async ({ api }) => {
		await cleanSlate();
		const minted = await idpLogoutToken({ aud: 'some-other-client' });
		const answer = await post(api, minted.token);

		expect(answer.status, 'a token for a different app was accepted').toBe(400);
		expect(await logouts(), 'the API was told to end sessions for another app’s token').toEqual([]);
	});

	test('a logout token from another issuer is refused, even signed by this issuer’s key', async ({ api }) => {
		await cleanSlate();
		const state = await idpState();
		const minted = await idpLogoutToken({ iss: `${state.issuer}/not-the-issuer` });
		const answer = await post(api, minted.token);

		expect(answer.status, 'a token naming a different issuer was accepted').toBe(400);
		expect(await logouts(), 'the API was told to end sessions for a foreign issuer’s token').toEqual([]);
	});

	test('a logout token older than the window is refused', async ({ api }) => {
		await cleanSlate();
		// Back-Channel Logout keeps a logout token acceptable for minutes, not hours: an old one is a replay of a
		// logout the provider already delivered.
		const minted = await idpLogoutToken({ claims: { iat: Math.floor(Date.now() / 1000) - 400 } });
		const answer = await post(api, minted.token);

		expect(answer.status, 'a 400-second-old logout token was accepted').toBe(400);
		expect(await logouts(), 'an expired logout token reached the API').toEqual([]);
	});

	test('a logout token must carry the back-channel logout event', async ({ api }) => {
		await cleanSlate();
		const minted = await idpLogoutToken({ claims: { events: null } });
		const answer = await post(api, minted.token);

		expect(answer.status, 'a token with no `events` claim was accepted').toBe(400);
		expect(await logouts(), 'a token that is not a logout event reached the API').toEqual([]);
	});

	test('a logout token must name a session or a person', async ({ api }) => {
		await cleanSlate();
		const minted = await idpLogoutToken({ claims: { sid: null, sub: null } });
		const answer = await post(api, minted.token);

		expect(answer.status, 'a token naming neither a session nor a subject was accepted').toBe(400);
		expect(await logouts(), 'a token naming nobody reached the API').toEqual([]);
	});

	test('a logout token must not carry a nonce', async ({ api }) => {
		await cleanSlate();
		// The nonce belongs to the front channel. Its presence means the token is a mislabelled ID token, which
		// is exactly what an attacker who can get the app to accept one would want.
		const minted = await idpLogoutToken({ claims: { nonce: 'pinned-by-an-attacker' } });
		const answer = await post(api, minted.token);

		expect(answer.status, 'a token carrying a nonce was accepted').toBe(400);
		expect(await logouts(), 'a front-channel token reached the API as a logout').toEqual([]);
	});

	test('a logout token without a jti is refused', async ({ api }) => {
		await cleanSlate();
		const minted = await idpLogoutToken({ claims: { jti: null } });
		const answer = await post(api, minted.token);

		expect(answer.status, 'a token with no replay id was accepted').toBe(400);
		expect(await logouts(), 'a token that cannot be de-duplicated reached the API').toEqual([]);
	});

	test('a token signed with a key the issuer does not publish is a 503, not a refusal', async ({ api }) => {
		await cleanSlate();
		// Around a key rotation the new key may not be published yet. Treating that as a bad token would drop a
		// real logout; the route says "not yet" so the provider can try again.
		const minted = await idpLogoutToken({ kid: 'playwright-ever-id-rotated-out' });
		const answer = await post(api, minted.token);

		expect(answer.status, `a token signed with an unpublished key answered ${answer.status}`).toBe(503);
		expect(await logouts(), 'the API was told to end sessions on an unverifiable token').toEqual([]);
	});

	test('the algorithm confusion is refused: a token signed with the issuer’s published public key', async ({ api }) => {
		await cleanSlate();
		// HS256 with the *public* key: the classic way to forge a token against a verifier that trusts whatever
		// algorithm the token names. The verifier accepts ES256, RS256 and EdDSA only.
		const forged = await idpLogoutToken({ alg: 'HS256' });
		const answer = await post(api, forged.token);

		expect(answer.status, 'an HS256 token signed with the public key was accepted').toBe(400);
		expect(await logouts(), 'a forged token reached the API').toEqual([]);
	});

	test('the `none` algorithm is refused', async ({ api }) => {
		await cleanSlate();
		const unsigned = await idpLogoutToken({ alg: 'none' });
		const answer = await post(api, unsigned.token);

		expect(answer.status, 'an unsigned token was accepted').toBe(400);
		expect(await logouts(), 'an unsigned token reached the API').toEqual([]);
	});

	test('something that is not a compact JWS never reaches the verifier', async ({ api }) => {
		await cleanSlate();
		const before = await askedTheIssuer();
		const answer = await post(api, 'not-a-logout-token');

		expect(answer.status, 'a bodysuit of a token was accepted').toBe(400);
		expect(await logouts(), 'the API was asked about a string that is not a token').toEqual([]);
		expect(await askedTheIssuer(), 'the issuer was contacted to check a string that is not a token').toBe(before);
	});

	test('a body that is not a form post is refused without contacting the issuer', async ({ api }) => {
		await cleanSlate();
		const minted = await idpLogoutToken();
		const before = await askedTheIssuer();

		const answer = await api(ROUTE, { method: 'POST', body: { logout_token: minted.token }, anonymous: true });
		const status = answer.status();
		expect(status, `a JSON body answered ${status} instead of 400`).toBe(400);
		expect(await logouts(), 'the API was asked about a body this route does not read').toEqual([]);
		expect(await askedTheIssuer(), 'the issuer was contacted for a body that was refused here').toBe(before);
	});

	test('a body over the route’s cap is refused while it is being read', async ({ api }) => {
		await cleanSlate();
		// The cap applies to the stream, not to a declared Content-Length, so a padded body cannot make the route
		// buffer it whole.
		const padded = new URLSearchParams({ logout_token: 'x'.repeat(64_000) }).toString();
		const answer = await api(ROUTE, {
			method: 'POST',
			body: padded,
			anonymous: true,
			headers: { 'content-type': 'application/x-www-form-urlencoded' }
		});

		expect(answer.status(), 'an oversized body was processed anyway').toBe(400);
		expect(await logouts(), 'the oversized body was forwarded').toEqual([]);
	});

	test('a token longer than the verifier accepts is refused before anything is fetched', async ({ api }) => {
		await cleanSlate();
		const before = await askedTheIssuer();
			const oversized = await idpLogoutToken({ claims: { padding: 'x'.repeat(20_000) } });
		const answer = await post(api, oversized.token);

		expect(answer.status, 'a token over the length cap was accepted').toBe(400);
		expect(await logouts(), 'an oversized token reached the API').toEqual([]);
		expect(await askedTheIssuer(), 'the issuer was contacted to check a token that was refused on length').toBe(before);
	});

	test('when the API cannot end the sessions, the provider is told to try again — and the same token then works', async ({
		api
	}) => {
		await cleanSlate();
		await mockScenario({ everIdLogout: 'down' });
		const minted = await idpLogoutToken();

		const down = await post(api, minted.token);
		expect(down.status, 'an unreachable API was answered as a finished logout').toBe(503);
		expect(await logouts(), 'the API was recorded as answering, while the route said 503').toHaveLength(1);

		// The whole point of the 503: the token was *not* remembered here, so the provider's retry is not a replay.
		await mockScenario({ everIdLogout: 'accepted' });
		const retry = await post(api, minted.token);
		expect(retry.status, 'the same logout token was refused as a replay after the API came back').toBe(200);
		expect(await logouts(), 'the retry did not reach the API').toHaveLength(2);
	});

	test('a rate-limited API is a retry too', async ({ api }) => {
		await cleanSlate();
		await mockScenario({ everIdLogout: 'rate_limited' });
		const minted = await idpLogoutToken();

		const answer = await post(api, minted.token);
		expect(answer.status, 'a rate-limited API was answered as a finished logout').toBe(503);
	});

	test('an API that cannot answer in time is a retry too', async ({ api }) => {
		await cleanSlate();
		// The forward gives up after 4 s (EVER_ID_LOGOUT_FORWARD_TIMEOUT_MS), because the identity provider is
		// waiting on this route's answer; the mock sits on the request longer than that.
		await mockScenario({
			everIdLogout: 'accepted',
			delays: { '/api/auth/zitadel/backchannel-logout': 6_000 }
		});
		const minted = await idpLogoutToken();

		const answer = await post(api, minted.token);
		expect(answer.status, 'an API that never answered was treated as a finished logout').toBe(503);
	});

	test('an API that refuses the token is finished: 200 here, and a second delivery is a replay', async ({ api }) => {
		await cleanSlate();
		// A 4xx from the API does not improve on a retry, so the token stays spent here — otherwise a provider
		// that retries a refused token would keep it alive.
		await mockScenario({ everIdLogout: 'refused' });
		const minted = await idpLogoutToken();

		const first = await post(api, minted.token);
		expect(first.status, 'a refused logout was answered as a retry').toBe(200);

		const second = await post(api, minted.token);
		expect(second.status, 'a spent logout token was accepted a second time').toBe(400);
	});

	test('the route answers the identity provider, not a page of this app', async ({ api }) => {
		await cleanSlate();
		// No same-origin guard here, and it must stay that way: the sender is the issuer's own server and the
		// credential is the signed token. What must not change is that this route reads no session cookie — an
		// anonymous request is the only shape it accepts, and a cross-site one is no more privileged than any other.
		const minted = await idpLogoutToken();
		const foreign = await post(api, minted.token, { origin: 'https://ever-id.example' });

		expect(foreign.status, 'the identity provider’s own cross-site post was refused').toBe(200);
	});

	test('no answer of this route is cacheable, and none carries a body', async ({ api }) => {
		await cleanSlate();
		const minted = await idpLogoutToken();
		const accepted = await post(api, minted.token);
		const refused = await post(api, `${minted.token}tampered`);

		for (const [what, answer] of [
			['the 200', accepted],
			['the 400', refused]
		] as const) {
			expect(answer.headers()['cache-control'] ?? '', `${what}: no cache directive`).toContain('no-store');
			expect(answer.body, `${what}: the route sent a body, and a logout answer should not name anything`).toBe('');
		}
	});
});
