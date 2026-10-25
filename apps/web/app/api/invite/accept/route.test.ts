/**
 * Proxy mode: the page of the invitation e-mail link posts /api/invite/accept, which used to fall on the [id] route
 * (no POST, 405), so the invitee never joined nor got a session. The route accepts with Gauzy, reads the invited
 * organization and its first team with the new token, and signs the browser in on its answer, like /api/auth/login.
 */
import { NextRequest } from 'next/server';
import {
	ACTIVE_TEAM_COOKIE_NAME,
	GAUZY_API_SERVER_URL,
	ORGANIZATION_ID_COOKIE_NAME,
	REFRESH_TOKEN_COOKIE_NAME,
	TENANT_ID_COOKIE_NAME,
	TOKEN_COOKIE_NAME
} from '@/core/constants/config/constants';
import { INVITED } from '@/test/auth/invited-person';
import { POST } from './route';

/** What the accept form posts. */
const INVITATION = {
	user: { firstName: 'Invited', lastName: 'Person', email: INVITED.email },
	password: 'a-password',
	code: INVITED.code,
	email: INVITED.email
};

/** Gauzy's answer to the invitation check the accept page makes (`POST /invite/validate-by-code`). */
const INVITATION_CHECK = {
	id: 'invite-1',
	email: INVITED.email,
	fullName: 'Invited Person',
	organization: { name: 'Acme' },
	isExpired: false
};

type GauzyAnswer = { status: number; body: unknown };

const originalFetch = global.fetch;

afterEach(() => {
	global.fetch = originalFetch;
});

/** A token that decodes like Gauzy's, acting in `organizationId` (the invited organization by default). */
function invitedAccessToken(organizationId: string = INVITED.organizationId): string {
	const now = Math.floor(Date.now() / 1000);
	const header = base64Url({ alg: 'HS256', typ: 'JWT' });
	const payload = base64Url({
		id: INVITED.userId,
		tenantId: INVITED.tenantId,
		organizationId,
		iat: now,
		exp: now + 3600
	});
	return `${header}.${payload}.signature`;
}

/** Gauzy's answer to an accept that signs the invitee in with `token`. */
function acceptedAnswer(token: string) {
	return {
		user: { id: INVITED.userId, tenantId: INVITED.tenantId, email: INVITED.email },
		token,
		refresh_token: INVITED.refreshToken
	};
}

function base64Url(part: object): string {
	const json = JSON.stringify(part);
	return Buffer.from(json).toString('base64url');
}

/** Gauzy answers each call by method and path (`POST /invite/accept`); a call it does not expect gets a 404. */
function gauzyAnswers(answers: Record<string, GauzyAnswer>): jest.Mock {
	const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
		const path = gauzyPathOf(url);
		const answer = answers[`${init.method} ${path}`];
		if (!answer) return Response.json({ statusCode: 404, message: 'Not Found' }, { status: 404 });

		return Response.json(answer.body, { status: answer.status });
	});
	global.fetch = fetchMock as unknown as typeof fetch;
	return fetchMock;
}

function gauzyPathOf(url: string): string {
	const pathAndQuery = url.slice(GAUZY_API_SERVER_URL.length);
	const [path] = pathAndQuery.split('?');
	return path;
}

/** Each call the route made to Gauzy, in order, by method and path. */
function gauzyCalls(fetchMock: jest.Mock): string[] {
	const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
	return calls.map(([url, init]) => {
		const path = gauzyPathOf(url);
		return `${init.method} ${path}`;
	});
}

function acceptRequest(contentType = 'application/json') {
	return new NextRequest('https://app.ever.team/api/invite/accept', {
		method: 'POST',
		headers: { 'content-type': contentType },
		body: JSON.stringify(INVITATION)
	});
}

describe('POST /api/invite/accept', () => {
	it('accepts with Gauzy, then signs the invitee in to the invited organization and its first team', async () => {
		const token = invitedAccessToken();
		const accepted = acceptedAnswer(token);
		const fetchMock = gauzyAnswers({
			'POST /invite/validate-by-code': { status: 201, body: INVITATION_CHECK },
			'POST /invite/accept': { status: 201, body: accepted },
			'GET /user-organization': {
				status: 200,
				body: {
					items: [
						{ organizationId: 'org-of-another-invite', organization: { name: 'Another' } },
						{ organizationId: INVITED.organizationId, organization: { name: 'Acme' } }
					],
					total: 2
				}
			},
			'GET /organization-team': { status: 200, body: { items: [{ id: INVITED.teamId }], total: 1 } }
		});

		const response = await POST(acceptRequest());

		// The answer is Gauzy's, as in direct mode
		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual(accepted);

		const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
		const [checkCall, acceptCall, organizationsCall, teamsCall] = calls;
		expect(JSON.parse(String(checkCall[1].body))).toEqual({ email: INVITED.email, code: INVITED.code });
		expect(JSON.parse(String(acceptCall[1].body))).toEqual(INVITATION);
		expect(organizationsCall[1].headers).toEqual(expect.objectContaining({ authorization: `Bearer ${token}` }));
		expect(teamsCall[1].headers).toEqual(expect.objectContaining({ authorization: `Bearer ${token}` }));
		expect(decodeURIComponent(teamsCall[0])).toContain(`where[organizationId]=${INVITED.organizationId}`);

		const cookies = response.headers.get('set-cookie') ?? '';
		expect(cookies).toContain(`${TOKEN_COOKIE_NAME}=${token}`);
		expect(cookies).toContain(`${REFRESH_TOKEN_COOKIE_NAME}=${INVITED.refreshToken}`);
		expect(cookies).toContain(`${TENANT_ID_COOKIE_NAME}=${INVITED.tenantId}`);
		expect(cookies).toContain(`${ORGANIZATION_ID_COOKIE_NAME}=${INVITED.organizationId}`);
		expect(cookies).toContain(`${ACTIVE_TEAM_COOKIE_NAME}=${INVITED.teamId}`);
	});

	it('signs a member of several organizations in to the invited one by name, as the accept page does in direct mode', async () => {
		// Gauzy's token acts in the organization the user already belonged to, also the first of the list
		const token = invitedAccessToken('org-before-the-invite');
		gauzyAnswers({
			'POST /invite/validate-by-code': { status: 201, body: INVITATION_CHECK },
			'POST /invite/accept': { status: 201, body: acceptedAnswer(token) },
			'GET /user-organization': {
				status: 200,
				body: {
					items: [
						{ organizationId: 'org-before-the-invite', organization: { name: 'Before' } },
						{ organizationId: INVITED.organizationId, organization: { name: 'Acme' } }
					],
					total: 2
				}
			},
			'GET /organization-team': { status: 200, body: { items: [{ id: INVITED.teamId }], total: 1 } }
		});

		const response = await POST(acceptRequest());

		expect(response.status).toBe(201);
		const cookies = response.headers.get('set-cookie') ?? '';
		expect(cookies).toContain(`${ORGANIZATION_ID_COOKIE_NAME}=${INVITED.organizationId}`);
		expect(cookies).not.toContain(`${ORGANIZATION_ID_COOKIE_NAME}=org-before-the-invite`);
	});

	it('still accepts when the invitation check gives no answer, and takes the first organization like direct mode', async () => {
		const token = invitedAccessToken('org-2');
		const fetchMock = gauzyAnswers({
			'POST /invite/accept': { status: 201, body: acceptedAnswer(token) },
			'GET /user-organization': {
				status: 200,
				body: {
					items: [
						{ organizationId: INVITED.organizationId, organization: { name: 'Acme' } },
						{ organizationId: 'org-2', organization: { name: 'Second' } }
					],
					total: 2
				}
			},
			'GET /organization-team': { status: 200, body: { items: [{ id: INVITED.teamId }], total: 1 } }
		});

		const response = await POST(acceptRequest());

		expect(response.status).toBe(201);
		expect(gauzyCalls(fetchMock)).toEqual([
			'POST /invite/validate-by-code',
			'POST /invite/accept',
			'GET /user-organization',
			'GET /organization-team'
		]);
		const cookies = response.headers.get('set-cookie') ?? '';
		expect(cookies).toContain(`${ORGANIZATION_ID_COOKIE_NAME}=${INVITED.organizationId}`);
	});

	it.each([
		['the status its body names', 429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' }],
		['a 400 when its body names none', 400, { message: 'Invite does not exist' }]
	])("answers Gauzy's refusal with %s, and signs nobody in", async (_case, status, body) => {
		const fetchMock = gauzyAnswers({ 'POST /invite/accept': { status, body } });

		const response = await POST(acceptRequest());

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toEqual(body);
		// Nothing is read with a token after the refusal
		expect(gauzyCalls(fetchMock)).toEqual(['POST /invite/validate-by-code', 'POST /invite/accept']);
		expect(response.headers.get('set-cookie')).toBeNull();
	});

	it('refuses a body that is not JSON without calling Gauzy, so another site cannot sign the browser in', async () => {
		const fetchMock = gauzyAnswers({});

		const response = await POST(acceptRequest('text/plain'));

		expect(response.status).toBe(415);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
