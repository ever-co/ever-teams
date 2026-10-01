/**
 * Test-only OpenID Provider on 127.0.0.1 (never part of the app): a discovery document and an ES256 key set;
 * it signs ID tokens and back-channel logout tokens and can rotate its key (unknown `kid` cases).
 *
 * `jose` is an ES module only: a test file that uses this loads it through Node itself, with
 * `jest.mock('jose', () => process.getBuiltinModule('node:module').createRequire(__filename)('jose'))`.
 */
import { createServer, type Server } from 'node:http';
import { SignJWT, exportJWK, generateKeyPair, type JWK, type JWTPayload } from 'jose';
import { close, listen, sendJson } from './http';

export const BACKCHANNEL_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

export class MockIssuer {
	issuer = '';
	kid = 'test-key-1';
	/** Every request (method and path), for egress assertions. */
	readonly requests: Array<{ method: string; path: string }> = [];
	private server: Server | null = null;
	private privateKey: CryptoKey | null = null;
	private publicJwk: JWK | null = null;

	constructor(readonly clientId: string) {}

	async start(): Promise<this> {
		await this.rotateKey(this.kid);
		this.server = createServer((req, res) => {
			const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
			this.requests.push({ method: req.method ?? 'GET', path });
			if (path === '/.well-known/openid-configuration') {
				return sendJson(res, 200, {
					issuer: this.issuer,
					authorization_endpoint: `${this.issuer}/oauth/v2/authorize`,
					token_endpoint: `${this.issuer}/oauth/v2/token`,
					userinfo_endpoint: `${this.issuer}/oidc/v1/userinfo`,
					jwks_uri: `${this.issuer}/oauth/v2/keys`
				});
			}
			if (path === '/oauth/v2/keys') {
				return sendJson(res, 200, { keys: [this.publicJwk] });
			}
			return sendJson(res, 404, { error: 'not_found' });
		});
		this.issuer = await listen(this.server);
		return this;
	}

	async stop(): Promise<void> {
		await close(this.server);
		this.server = null;
	}

	/** A new signing key (published from now on); returns the key so a test can sign with it. */
	async rotateKey(kid: string): Promise<void> {
		const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
		this.privateKey = privateKey;
		this.publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' };
		this.kid = kid;
	}

	/** Signs claims with the current key (or with a key the issuer does not publish). */
	async sign(claims: JWTPayload, options: { kid?: string; key?: CryptoKey } = {}): Promise<string> {
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
			jti: `jti-${Math.random().toString(36).slice(2)}`,
			sid: 'session-1',
			sub: 'person-1',
			events: { [BACKCHANNEL_EVENT]: {} },
			...overrides
		} as JWTPayload;
	}

	/** ID token claims of the Ever ID sign-in for `subject`. */
	idTokenClaims(subject: string, overrides: Record<string, unknown> = {}): JWTPayload {
		const now = Math.floor(Date.now() / 1000);
		return {
			iss: this.issuer,
			sub: subject,
			aud: this.clientId,
			azp: this.clientId,
			iat: now,
			exp: now + 600,
			email: `${subject}@example.test`,
			email_verified: true,
			given_name: 'Test',
			family_name: 'Person',
			sid: `sid-${subject}`,
			...overrides
		} as JWTPayload;
	}
}
