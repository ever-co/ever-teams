/**
 * The workspace sign-in must never write a token to the server log: the pods' logs are readable by anyone with
 * cluster access. Covers POST /api/auth/signin-workspace (its handler sits in `../_signin-workspace`) and the
 * Pages-style handler kept next to it in `signin-workspace.ts`, which printed Gauzy's whole login answer on the
 * invite path. The answer body and the auth cookies still carry the tokens, unchanged.
 * Runs against a stand-in of the Gauzy API.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest } from 'next/server';
import { INVITED, expectNoInvitedSecretsIn, primeInvitedPerson } from '@/test/auth/invited-person';
import { tolerateServerFetchRejections } from '@/test/auth/server-fetch-rejections';
import { MockGauzyApi } from '@/test/ever-id/mock-gauzy-api';
import { captureConsole } from '@/test/server-logs';

const ORIGINAL_ENV = { ...process.env };

let gauzy: MockGauzyApi;
let logs: ReturnType<typeof captureConsole>;

beforeAll(async () => {
	gauzy = await new MockGauzyApi().start();
});

afterAll(async () => {
	await gauzy.stop();
	process.env = ORIGINAL_ENV;
});

beforeEach(() => {
	gauzy.reset();
	primeInvitedPerson(gauzy);
	logs = captureConsole();
});

afterEach(() => {
	jest.restoreAllMocks();
});

/** Loads a module of this route against the stand-in, isolated so the API URL constant re-evaluates. */
function load<T extends object>(path: './route' | './signin-workspace'): T {
	process.env.GAUZY_API_SERVER_URL = gauzy.origin;
	let mod: T | undefined;
	jest.isolateModules(() => {
		mod = jest.requireActual<T>(path);
	});
	return mod as T;
}

describe('POST /api/auth/signin-workspace — server log', () => {
	it('signs a person in to the workspace they picked without writing a token to the log', async () => {
		// No code to accept an invite with: Gauzy answers 400, so the route signs in with the workspace token.
		gauzy.on('POST', '/api/invite/validate-by-code', {
			status: 400,
			body: { statusCode: 400, message: 'Bad Request' }
		});
		tolerateServerFetchRejections();
		// The stand-in's /auth/signin.workspace answers user-1's tokens for this workspace token.
		const workspaceToken = `workspace-token-${INVITED.userId}`;
		const accessToken = `gauzy-access-${INVITED.userId}`;
		const refreshToken = `gauzy-refresh-${INVITED.userId}`;
		const { POST } = load<typeof import('./route')>('./route');

		const res = await POST(
			new NextRequest('https://app.ever.team/api/auth/signin-workspace', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'person@example.test', token: workspaceToken, teamId: INVITED.teamId })
			})
		);

		// Behaviour is unchanged: the answer and the cookies carry the tokens.
		expect(res.status).toBe(200);
		expect((await res.json()).loginResponse.token).toBe(accessToken);
		const cookies = res.headers.get('set-cookie') ?? '';
		expect(cookies).toContain(`auth-token=${accessToken}`);
		expect(cookies).toContain(`auth-refresh-token=${refreshToken}`);

		const log = logs.text();
		expect(log).not.toContain(workspaceToken);
		expect(log).not.toContain(accessToken);
		expect(log).not.toContain(refreshToken);
	});

	it('signs an invited person in without writing their tokens or generated password to the log', async () => {
		// The e-mailed code matches an invite: the route accepts it, which signs the person in.
		const { POST } = load<typeof import('./route')>('./route');

		const res = await POST(
			new NextRequest('https://app.ever.team/api/auth/signin-workspace', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: INVITED.email, code: INVITED.code, token: '', teamId: INVITED.teamId })
			})
		);

		// Behaviour is unchanged: the answer and the cookies carry the tokens.
		expect(res.status).toBe(200);
		const answer = await res.json();
		expect(answer.loginResponse.token).toBe(INVITED.accessToken);
		expect(answer.team.id).toBe(INVITED.teamId);
		const cookies = res.headers.get('set-cookie') ?? '';
		expect(cookies).toContain(`auth-token=${INVITED.accessToken}`);
		expect(cookies).toContain(`auth-refresh-token=${INVITED.refreshToken}`);

		const log = logs.text();
		expectNoInvitedSecretsIn(log, gauzy);
		// The log still says who signed in, by id: the line ran, it just no longer carries the secrets.
		expect(log).toContain(INVITED.userId);
		expect(log).toContain(INVITED.tenantId);
		expect(log).toContain(INVITED.organizationId);
	});
});

describe('Pages-style workspace sign-in handler (signin-workspace.ts) — server log', () => {
	/** The few parts of NextApiRequest / NextApiResponse the handler and cookies-next use. */
	function pagesExchange(body: Record<string, unknown>) {
		const headers = new Map<string, unknown>();
		type Answer = { loginResponse?: { token?: string }; team?: { id?: string } };
		const sent: { status?: number; body?: Answer } = {};
		const req = { method: 'POST', body, cookies: {}, headers: {} } as unknown as NextApiRequest;
		const res = {
			getHeader: (name: string) => headers.get(name.toLowerCase()),
			setHeader(name: string, value: unknown) {
				headers.set(name.toLowerCase(), value);
				return this;
			},
			status(code: number) {
				sent.status = code;
				return this;
			},
			json(payload: Answer) {
				sent.body = payload;
				return this;
			}
		} as unknown as NextApiResponse;
		return { req, res, sent, headers };
	}

	it('signs an invited person in without writing their tokens or generated password to the log', async () => {
		const { default: handler } = load<typeof import('./signin-workspace')>('./signin-workspace');
		const { req, res, sent, headers } = pagesExchange({
			email: INVITED.email,
			code: INVITED.code,
			token: '',
			teamId: INVITED.teamId
		});

		await handler(req, res);
		// cookies-next writes the Set-Cookie header from a promise of its own.
		await new Promise((resolve) => setImmediate(resolve));

		// Behaviour is unchanged: the answer and the cookies carry the tokens.
		expect(sent.status).toBe(200);
		expect(sent.body?.loginResponse?.token).toBe(INVITED.accessToken);
		expect(sent.body?.team?.id).toBe(INVITED.teamId);
		const cookies = String(headers.get('set-cookie') ?? '');
		expect(cookies).toContain(`auth-token=${INVITED.accessToken}`);
		expect(cookies).toContain(`auth-refresh-token=${INVITED.refreshToken}`);

		const log = logs.text();
		expectNoInvitedSecretsIn(log, gauzy);
		// The log still says who signed in, by id: the line ran, it just no longer carries the secrets.
		expect(log).toContain(INVITED.userId);
		expect(log).toContain(INVITED.tenantId);
	});
});
