/**
 * A stand-in for the Ever ID identity provider, for the Playwright Ever ID suite only.
 *
 * `apps/web/app/api/auth/ever-id/backchannel-logout` checks a logout token the *issuer* signs: the signature
 * against the issuer's published keys, then the claims (core/lib/auth/ever-id/logout-token.ts). Unit tests
 * cover that checker with a fake key getter. What only a running app can prove is the whole road: the route's
 * own body rules, the discovery it really performs, which answer of the API becomes which answer of the route,
 * and the replay memory that lives in the app process.
 *
 * So this is a real OpenID Connect issuer on the loopback: it serves a discovery document and a JSON Web Key
 * Set, and mints RS256 logout tokens for the client id the app is configured with. Minting happens *here*, not
 * in a test, so no private key ever leaves this process — a test asks for a token and gets the compact JWS.
 *
 * Local http is enough on purpose: the issuer checker allows a plain-http issuer only on the local machine
 * (`LOOPBACK_HOSTS` in ever-id/config.ts), which is what makes a fake issuer possible without a certificate.
 *
 * Loopback only, no page, JSON only, and nothing here is reachable from a browser.
 */
import { createServer } from 'node:http';
import { createHash, createHmac, createSign, generateKeyPairSync } from 'node:crypto';

const BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout'; // NOSONAR

const jsonClone = (value) => JSON.parse(JSON.stringify(value));
const base64Url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** The key a genuine token is signed with, and the one the issuer never publishes. */
const PUBLISHED_KID = 'playwright-ever-id-key';
const UNPUBLISHED_KID = 'playwright-ever-id-rotated-out';

/** One signing key of this issuer: its public half may or may not be in the published key set. */
function issueKey(kid, { published }) {
	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	return {
		kid,
		published,
		privateKey,
		/** The public key as a JWK, the way a JWKS serves it. */
		jwk: { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' },
		/** The public key as PEM: what an HS256 forgery is signed with, which is the point of that case. */
		publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString()
	};
}

/**
 * Creates the fake issuer and listens.
 *
 * @param {{ port: number, clientId: string, path?: string }} options the loopback port, the client id minted
 *   tokens are addressed to, and the path the issuer is mounted on (part of its `iss`)
 */
export async function createEverIdIdp({ port, clientId, path = '/oidc' }) {
	const ISSUER = `http://127.0.0.1:${port}${path}`;
	const keys = [issueKey(PUBLISHED_KID, { published: true }), issueKey(UNPUBLISHED_KID, { published: false })];
	const keyOf = (kid) => keys.find((key) => key.kid === kid) ?? keys[0];

	const state = {
		/** What the app asked this issuer for, in the order it asked: proves a refusal never reached the issuer. */
		contacts: [],
		/** Tokens minted here: their claims only, never a signature or a key. */
		minted: [],
		/** Whether the discovery document answers: `false` stands for an issuer that cannot be reached. */
		discoveryAvailable: true
	};
	let mintedCount = 0;

	/**
	 * RS256 (genuine), HS256 (the algorithm-confusion forgery: signed with the issuer's *public* key, which is
	 * published) or the `none` algorithm. All three must be refused by a correct verifier.
	 */
	/** Signs with `kid`'s private key; `headerKid` names a different key in the header, which is how a token
	 * signed by a key the issuer never published still points at one it did — a signature that does not match. */
	function sign({ claims, alg, kid, headerKid }) {
		const key = keyOf(kid);
		const signingInput = `${base64Url({ alg, typ: 'JWT', kid: headerKid ?? kid })}.${base64Url(claims)}`;
		if (alg === 'none') return `${signingInput}.`;
		if (alg === 'HS256')
			return `${signingInput}.${createHmac('sha256', key.publicPem).update(signingInput).digest('base64url')}`;
		return `${signingInput}.${createSign('sha256').update(signingInput).sign(key.privateKey).toString('base64url')}`;
	}

	/**
	 * Mints a logout token. `claims` adds or replaces claims; a claim set to `null` is left out, which is how a
	 * test drops the `jti`, the `events` claim, or both `sid` and `sub`. `kid` is the key that signs it and
	 * `headerKid` the key the token names, so a case can sign with the unpublished key while naming the
	 * published one — a signature that does not match the key the verifier will look up.
	 */
	function mint(options = {}) {
		mintedCount += 1;
		const alg = options.alg ?? 'RS256';
		const kid = options.kid ?? PUBLISHED_KID;
		const claims = {
			iss: options.iss ?? ISSUER,
			aud: options.aud ?? clientId,
			sub: `playwright-ever-id-user-${mintedCount}`,
			sid: `playwright-ever-id-session-${mintedCount}`,
			iat: Math.floor(Date.now() / 1000),
			jti: `playwright-ever-id-jti-${mintedCount}`,
			events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
			...(options.claims ?? {})
		};
		for (const [name, value] of Object.entries(claims)) if (value === null) delete claims[name];

		const headerKid = options.headerKid ?? kid;
		const token = sign({ claims, alg, kid, headerKid });
		// The hash, not the token: enough for a test to prove *which* token travelled through the app, without
		// this file or a test report ever carrying a signed credential.
		state.minted.push({ kid, headerKid, alg, claims, sha256: sha256(token) });
		return { token, claims, alg, kid, headerKid, sha256: sha256(token) };
	}

	const handle = (request, response) => {
		const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
		const send = (status, payload) => {
			response.writeHead(status, {
				'cache-control': 'no-store',
				'content-type': 'application/json; charset=utf-8'
			});
			response.end(JSON.stringify(payload));
		};

		if (request.method === 'GET' && url.pathname === `${path}/.well-known/openid-configuration`) {
			state.contacts.push({ method: 'GET', path: 'discovery' });
			if (!state.discoveryAvailable) return send(500, { error: 'discovery unavailable' });
			return send(200, {
				issuer: ISSUER,
				jwks_uri: `${ISSUER}/jwks`,
				authorization_endpoint: `${ISSUER}/authorize`,
				token_endpoint: `${ISSUER}/token`,
				end_session_endpoint: `${ISSUER}/logout`,
				id_token_signing_alg_values_supported: ['RS256'],
				backchannel_logout_supported: true,
				backchannel_logout_session_supported: true
			});
		}
		if (request.method === 'GET' && url.pathname === `${path}/jwks`) {
			state.contacts.push({ method: 'GET', path: 'jwks' });
			return send(200, { keys: keys.filter((key) => key.published).map((key) => key.jwk) });
		}
		if (request.method === 'GET' && url.pathname === '/state') return send(200, stateView());
		if (request.method === 'POST' && url.pathname === '/reset') {
			reset();
			return send(200, { ok: true });
		}
		return send(404, { error: `no issuer route for ${request.method} ${url.pathname}` });
	};

	function stateView() {
		return { issuer: ISSUER, contacts: jsonClone(state.contacts), minted: jsonClone(state.minted) };
	}

	function reset() {
		state.contacts = [];
		state.minted = [];
		state.discoveryAvailable = true;
	}

	const server = createServer((request, response) => {
		void Promise.resolve(handle(request, response)).catch(() => {
			if (response.writableEnded) return;
			response.writeHead(500, { 'content-type': 'application/json' });
			response.end(JSON.stringify({ error: 'fake issuer failed' }));
		});
	});

	await new Promise((done, fail) => server.once('error', fail).listen(port, '127.0.0.1', done));

	return {
		issuer: ISSUER,
		clientId,
		mint,
		state: stateView,
		reset,
		/** An issuer that cannot answer its discovery document: the app must not pretend a token was checked. */
		setDiscoveryAvailable: (available) => {
			state.discoveryAvailable = available;
		},
		close: () => new Promise((done) => server.close(done))
	};
}
