/**
 * Test-only HTTP stand-ins for the Ever ID sign-in tests (never part of the app):
 *
 * - MockIssuer: an OpenID Provider on 127.0.0.1 with a discovery document and an ES256 key set; it signs ID
 *   tokens and back-channel logout tokens and can rotate its key (unknown `kid` cases).
 * - MockGauzyApi: the Gauzy API routes Ever Teams calls for Ever ID (`/api/auth/zitadel/*`, the required
 *   terms and the workspace sign-in), answering with the statuses and payload shapes of the API's Ever ID
 *   plugin. Every request is recorded (method, path, content type, parsed body).
 *
 * `jose` is an ES module only: test files that use these helpers load it through Node itself, with
 * `jest.mock('jose', () => process.getBuiltinModule('node:module').createRequire(__filename)('jose'))`.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SignJWT, exportJWK, generateKeyPair, type JWK, type JWTPayload } from 'jose';

export const BACKCHANNEL_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

async function readBody(req: IncomingMessage): Promise<string> {
	let data = '';
	for await (const chunk of req) data += chunk;
	return data;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
	res.statusCode = status;
	if (body === undefined) {
		res.end();
		return;
	}
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(body));
}

async function listen(server: Server): Promise<string> {
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function close(server: Server | null): Promise<void> {
	if (!server) return;
	server.closeAllConnections();
	await new Promise<void>((resolve) => server.close(() => resolve()));
}

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

export interface RecordedRequest {
	method: string;
	path: string;
	contentType: string;
	body: unknown;
	raw: string;
}

type Answer = { status: number; body?: unknown };
type Handler = (request: RecordedRequest) => Answer | Promise<Answer>;

/** A workspace entry as the API's Ever ID routes answer it. */
export function everIdWorkspace(userId: string, tenantId: string | null, tenantName: string) {
	return {
		token: `workspace-token-${userId}`,
		user: {
			id: userId,
			email: 'person@example.test',
			name: 'Test Person',
			imageUrl: null,
			lastTeamId: null,
			lastLoginAt: '2026-09-01T10:00:00.000Z',
			tenant: tenantId ? { id: tenantId, name: tenantName, logo: '' } : null
		}
	};
}

/** The 200 answer of `/token`, `/confirm` and `/signup` with these workspaces. */
export function workspacesAnswer(workspaces: ReturnType<typeof everIdWorkspace>[], blocked: unknown[] = []) {
	return {
		workspaces,
		confirmed_email: 'person@example.test',
		show_popup: workspaces.length > 1,
		total_workspaces: workspaces.length,
		blocked_workspaces: blocked
	};
}

/** The documents `GET /api/terms/required` lists by default. */
export const REQUIRED_TERMS = [
	{
		documentId: 'tos:gauzy',
		version: '1.0.2',
		sha256: 'a'.repeat(64),
		locale: 'en',
		url: '/legal/tos',
		title: 'Terms of Service',
		effectiveDate: '2026-08-02'
	},
	{
		documentId: 'privacy:gauzy',
		version: '1.0.2',
		sha256: 'b'.repeat(64),
		locale: 'en',
		url: '/legal/privacy',
		title: 'Privacy Policy',
		effectiveDate: '2026-08-02'
	}
];

export class MockGauzyApi {
	/** The API origin, without `/api` (what GAUZY_API_SERVER_URL holds). */
	origin = '';
	readonly requests: RecordedRequest[] = [];
	private readonly handlers = new Map<string, Handler>();
	private server: Server | null = null;

	constructor() {
		this.reset();
	}

	/** Back to the default answers: every route of the plugin answers as for a linked person with one workspace. */
	reset(): void {
		this.requests.length = 0;
		this.handlers.clear();
		this.on('POST', '/api/auth/zitadel/token', () => ({
			status: 200,
			body: workspacesAnswer([everIdWorkspace('user-1', 'tenant-1', 'Acme')])
		}));
		this.on('POST', '/api/auth/zitadel/confirm', () => ({
			status: 200,
			body: workspacesAnswer([everIdWorkspace('user-1', 'tenant-1', 'Acme')])
		}));
		this.on('POST', '/api/auth/zitadel/signup/details', () => ({
			status: 200,
			body: { email: 'new.person@example.test', firstName: 'New', lastName: 'Person' }
		}));
		this.on('POST', '/api/auth/zitadel/signup', () => ({
			status: 200,
			body: workspacesAnswer([everIdWorkspace('new-user', null, '')])
		}));
		this.on('POST', '/api/auth/zitadel/backchannel-logout', () => ({ status: 200 }));
		this.on('GET', '/api/terms/required', () => ({ status: 200, body: REQUIRED_TERMS }));
		this.on('POST', '/api/auth/signin.workspace', () => ({
			status: 200,
			body: {
				user: { id: 'new-user', tenantId: null },
				token: 'gauzy-access-1',
				refresh_token: 'gauzy-refresh-1'
			}
		}));
	}

	/** Sets the answer of a route (a fixed answer or a function of the recorded request). */
	on(method: string, path: string, answer: Handler | Answer): void {
		this.handlers.set(`${method} ${path}`, typeof answer === 'function' ? answer : () => answer);
	}

	/** The recorded requests to one route. */
	calls(method: string, path: string): RecordedRequest[] {
		return this.requests.filter((request) => request.method === method && request.path === path);
	}

	async start(): Promise<this> {
		this.server = createServer(async (req, res) => {
			const url = new URL(req.url ?? '/', 'http://127.0.0.1');
			const raw = await readBody(req);
			const contentType = String(req.headers['content-type'] ?? '');
			let body: unknown = raw;
			if (contentType.includes('application/json') && raw) body = JSON.parse(raw);
			else if (contentType.includes('application/x-www-form-urlencoded')) {
				body = Object.fromEntries(new URLSearchParams(raw));
			}
			const request: RecordedRequest = {
				method: req.method ?? 'GET',
				path: url.pathname,
				contentType,
				body,
				raw
			};
			this.requests.push(request);
			const handler = this.handlers.get(`${request.method} ${request.path}`);
			if (!handler)
				return sendJson(res, 404, { statusCode: 404, message: `Cannot ${request.method} ${request.path}` });
			const answer = await handler(request);
			return sendJson(res, answer.status, answer.body);
		});
		this.origin = await listen(this.server);
		return this;
	}

	async stop(): Promise<void> {
		await close(this.server);
		this.server = null;
	}
}
