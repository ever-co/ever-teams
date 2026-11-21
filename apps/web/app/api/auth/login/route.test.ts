/**
 * POST /api/auth/login, the passcode sign-in's second attempt in proxy mode: a code that matches an invitation accepts
 * it and signs the person in. An invitation sent from the Invite dialog carries no name (Gauzy answers `fullName`
 * null), and the route answered 500 on it. Runs against a stand-in of the Gauzy API.
 */
import { NextRequest } from 'next/server';
import { INVITED, primeInvitedPerson } from '@/test/auth/invited-person';
import { MockGauzyApi } from '@/test/ever-id/mock-gauzy-api';
import { captureConsole } from '@/test/server-logs';

const ORIGINAL_ENV = { ...process.env };

type RouteModule = typeof import('./route');

let gauzy: MockGauzyApi;

beforeAll(async () => {
	gauzy = await new MockGauzyApi().start();
});

afterAll(async () => {
	await gauzy.stop();
	process.env = ORIGINAL_ENV;
});

beforeEach(() => {
	gauzy.reset();
	captureConsole();
});

afterEach(() => {
	jest.restoreAllMocks();
});

/** Loads the route against the stand-in, isolated so the API URL constant re-evaluates. */
function loadRoute(): RouteModule {
	process.env.GAUZY_API_SERVER_URL = gauzy.origin;
	let mod: RouteModule | undefined;
	jest.isolateModules(() => {
		mod = jest.requireActual<RouteModule>('./route');
	});
	return mod as RouteModule;
}

function post(body: Record<string, unknown>) {
	return new NextRequest('https://app.example.com/api/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

describe('POST /api/auth/login, invitation code', () => {
	it('signs in a person whose invitation carries no name, as one sent from the Invite dialog', async () => {
		primeInvitedPerson(gauzy, null);
		const { POST } = loadRoute();

		const res = await POST(post({ email: INVITED.email, code: INVITED.code }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.team.id).toBe(INVITED.teamId);
		expect(body.loginResponse.token).toBe(INVITED.accessToken);
		expect(res.headers.get('set-cookie') ?? '').toContain(`auth-token=${INVITED.accessToken}`);
		const [accept] = gauzy.calls('POST', '/api/invite/accept');
		expect(accept?.body).toMatchObject({
			code: INVITED.code,
			email: INVITED.email,
			user: { firstName: '', lastName: '', email: INVITED.email }
		});
	}, 15_000);

	it('still gives the invitation name to the account it opens', async () => {
		primeInvitedPerson(gauzy);
		const { POST } = loadRoute();

		const res = await POST(post({ email: INVITED.email, code: INVITED.code }));

		expect(res.status).toBe(200);
		const [accept] = gauzy.calls('POST', '/api/invite/accept');
		expect(accept?.body).toMatchObject({ user: { firstName: 'Invited', lastName: 'Person' } });
	}, 15_000);
});
