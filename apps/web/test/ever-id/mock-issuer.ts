/**
 * Test-only OpenID Provider on 127.0.0.1 (never part of the app): a discovery document and an ES256 key set;
 * it signs back-channel logout tokens and can rotate its key (unknown `kid` cases).
 *
 * `jose` is an ES module only: a test file that uses this loads it through Node itself, with
 * `jest.mock('jose', () => process.getBuiltinModule('node:module').createRequire(__filename)('jose'))`.
 */
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { SignJWT, exportJWK, generateKeyPair, type JWK, type JWTPayload } from 'jose';
import { close, listen, sendJson } from './http';

// A specification identifier compared as a string, never requested.
const BACKCHANNEL_EVENT = 'http://schemas.openid.net/event/backchannel-logout'; // NOSONAR

export class MockIssuer {
	issuer = '';
	kid = 'test-key-1';
	/** The `jwks_uri` the discovery document announces instead of the issuer's own key set (issuer rule cases). */
	jwksUri: string | undefined;
	/** Every request (method and path), for egress assertions. */
	readonly requests: Array<{ method: string; path: string }> = [];
	private server: Server | null = null;
	private privateKey: CryptoKey | null = null;
	private publicJwk: JWK | null = null;

	/** `issuerPath` makes an issuer identifier with a path (`http://127.0.0.1:<port>/realms/teams`). */
	constructor(
		readonly clientId: string,
		private readonly issuerPath = ''
	) {}

	async start(): Promise<this> {
		await this.rotateKey(this.kid);
		this.server = createServer((req, res) => {
			const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
			this.requests.push({ method: req.method ?? 'GET', path });
			if (path === `${this.issuerPath}/.well-known/openid-configuration`) {
				return sendJson(res, 200, {
					issuer: this.issuer,
					authorization_endpoint: `${this.issuer}/oauth/v2/authorize`,
					token_endpoint: `${this.issuer}/oauth/v2/token`,
					userinfo_endpoint: `${this.issuer}/oidc/v1/userinfo`,
					jwks_uri: this.jwksUri ?? `${this.issuer}/oauth/v2/keys`
				});
			}
			if (path === `${this.issuerPath}/oauth/v2/keys`) {
				return sendJson(res, 200, { keys: [this.publicJwk] });
			}
			return sendJson(res, 404, { error: 'not_found' });
		});
		this.issuer = `${await listen(this.server)}${this.issuerPath}`;
		return this;
	}

	async stop(): Promise<void> {
		await close(this.server);
		this.server = null;
	}

	/** A new signing key, published from now on; later `sign()` calls use it. */
	async rotateKey(kid: string): Promise<void> {
		const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
		this.privateKey = privateKey;
		this.publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' };
		this.kid = kid;
	}

	/** Signs claims with the current key (or with a key the issuer does not publish). */
	sign(claims: JWTPayload, options: { kid?: string; key?: CryptoKey } = {}): Promise<string> {
		return new SignJWT(claims)
			.setProtectedHeader({ alg: 'ES256', kid: options.kid ?? this.kid, typ: 'JWT' })
			.sign(options.key ?? (this.privateKey as CryptoKey));
	}

	/** A back-channel logout token for this app, valid unless overridden. */
	logoutClaims(overrides: Record<string, unknown> = {}): JWTPayload {
		return {
			iss: this.issuer,
			aud: this.clientId,
			iat: Math.floor(Date.now() / 1000),
			jti: `jti-${randomUUID()}`,
			sid: 'session-1',
			sub: 'person-1',
			events: { [BACKCHANNEL_EVENT]: {} },
			...overrides
		} as JWTPayload;
	}
}
