/**
 * POST /api/auth/signin-email-confirm must never write a token to the server log: the pods' logs are readable by
 * anyone with cluster access. The route used to print Gauzy's whole login answer (access and refresh token) on
 * the invite path. The answer body and the auth cookies still carry the tokens, unchanged.
 * Runs against a stand-in of the Gauzy API.
 */
import { NextRequest } from 'next/server';
import { INVITED, expectNoInvitedSecretsIn, primeInvitedPerson } from '@/test/auth/invited-person';
import { tolerateServerFetchRejections } from '@/test/auth/server-fetch-rejections';
import { MockGauzyApi, everIdWorkspace, workspacesAnswer } from '@/test/ever-id/mock-gauzy-api';
import { captureConsole } from '@/test/server-logs';

const ORIGINAL_ENV = { ...process.env };

type RouteModule = typeof import('./route');

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
	logs = captureConsole();
});

afterEach(() => {
	jest.restoreAllMocks();
});

function loadRoute(): RouteModule {
	process.env.GAUZY_API_SERVER_URL = gauzy.origin;
	let mod: RouteModule | undefined;
	jest.isolateModules(() => {
		mod = jest.requireActual<RouteModule>('./route');
	});
	return mod as RouteModule;
}

/** A NextRequest, as Next hands a route handler: the auth cookies are set on its `cookies` too. */
function post(body: Record<string, unknown>) {
	return new NextRequest('https://app.ever.team/api/auth/signin-email-confirm', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

describe('POST /api/auth/signin-email-confirm — server log', () => {
	it('signs an invited person in without writing their tokens or generated password to the log', async () => {
		primeInvitedPerson(gauzy);
		const { POST } = loadRoute();

		const res = await POST(post({ email: INVITED.email, code: INVITED.code }));

		// Behaviour is unchanged: the answer and the cookies carry the tokens.
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.loginResponse.token).toBe(INVITED.accessToken);
		expect(body.loginResponse.refresh_token).toBe(INVITED.refreshToken);
		expect(body.team.id).toBe(INVITED.teamId);
		const cookies = res.headers.get('set-cookie') ?? '';
		expect(cookies).toContain(`auth-token=${INVITED.accessToken}`);
		expect(cookies).toContain(`auth-refresh-token=${INVITED.refreshToken}`);

		const log = logs.text();
		expectNoInvitedSecretsIn(log, gauzy);
		// The log still says who signed in, by id: the line ran, it just no longer carries the secrets.
		expect(log).toContain(INVITED.userId);
		expect(log).toContain(INVITED.tenantId);
	});

	it('confirms a sign-in code without writing the workspace tokens to the log', async () => {
		// No invite matches the code: Gauzy answers 400, so the route confirms the sign-in code instead.
		gauzy.on('POST', '/api/invite/validate-by-code', {
			status: 400,
			body: { statusCode: 400, message: 'Bad Request' }
		});
		tolerateServerFetchRejections();
		const workspace = everIdWorkspace(INVITED.userId, INVITED.tenantId, 'Acme');
		gauzy.on('POST', '/api/auth/signin.email/confirm', { status: 201, body: workspacesAnswer([workspace]) });
		const { POST } = loadRoute();

		const res = await POST(post({ email: 'person@example.test', code: INVITED.code }));

		expect(res.status).toBe(200);
		expect((await res.json()).workspaces[0].token).toBe(workspace.token);
		expect(logs.text()).not.toContain(workspace.token);
	});
});
