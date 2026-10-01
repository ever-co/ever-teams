/**
 * Test-only stand-in of the Gauzy API routes Ever Teams calls for Ever ID (never part of the app):
 * `/api/auth/zitadel/*`, the required terms and the workspace sign-in, answering with the statuses and
 * payload shapes of the API's Ever ID plugin. Every request is recorded (method, path, content type, parsed
 * body), and every answer can be replaced per test.
 */
import { createServer, type Server } from 'node:http';
import { close, listen, readBody, sendJson } from './http';

interface RecordedRequest {
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
