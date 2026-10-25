/**
 * Proxy mode: the page of the invitation e-mail link posts /api/invite/accept, which used to fall on the [id] route
 * (no POST, 405), so the invitee never joined nor got a session. The route accepts with Gauzy, reads the
 * organization and the first team with the new token, and signs the browser in on its answer, like /api/auth/login.
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

type GauzyAnswer = { status: number; body: unknown };

const originalFetch = global.fetch;

afterEach(() => {
	global.fetch = originalFetch;
});

/** A token that decodes like Gauzy's, acting in the invited organization (pickTokenOrganization reads it). */
function invitedAccessToken(): string {
	const now = Math.floor(Date.now() / 1000);
	const header = base64Url({ alg: 'HS256', typ: 'JWT' });
	const payload = base64Url({
		id: INVITED.userId,
		tenantId: INVITED.tenantId,
		organizationId: INVITED.organizationId,
		iat: now,
		exp: now + 3600
	});
	return `${header}.${payload}.signature`;
}

function base64Url(part: object): string {
	const json = JSON.stringify(part);
	return Buffer.from(json).toString('base64url');
}

/** Gauzy answers each call by method and path (`POST /invite/accept`); a call it does not expect gets a 404. */
function gauzyAnswers(answers: Record<string, GauzyAnswer>): jest.Mock {
	const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
		const pathAndQuery = url.slice(GAUZY_API_SERVER_URL.length);
		const [path] = pathAndQuery.split('?');
		const answer = answers[`${init.method} ${path}`];
		if (!answer) return Response.json({ statusCode: 404, message: 'Not Found' }, { status: 404 });

		return Response.json(answer.body, { status: answer.status });
	});
	global.fetch = fetchMock as unknown as typeof fetch;
	return fetchMock;
}

function acceptRequest(contentType = 'application/json') {
	return new NextRequest('https://app.ever.team/api/invite/accept', {
		method: 'POST',
		headers: { 'content-type': contentType },
		body: JSON.stringify(INVITATION)
	});
}

describe('POST /api/invite/accept', () => {
	it('accepts with Gauzy, then signs the invitee in to the organization of the new token and its first team', async () => {
		const token = invitedAccessToken();
		const accepted = {
			user: { id: INVITED.userId, tenantId: INVITED.tenantId, email: INVITED.email },
			token,
			refresh_token: INVITED.refreshToken
		};
		const fetchMock = gauzyAnswers({
			'POST /invite/accept': { status: 201, body: accepted },
			'GET /user-organization': {
				status: 200,
				body: {
					items: [{ organizationId: 'org-of-another-invite' }, { organizationId: INVITED.organizationId }],
					total: 2
				}
			},
			'GET /organization-team': { status: 200, body: { items: [{ id: INVITED.teamId }], total: 1 } }
		});

		const response = await POST(acceptRequest());

		// The answer is Gauzy's, as in direct mode
		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual(accepted);

		const [acceptCall, organizationsCall, teamsCall] = fetchMock.mock.calls as Array<[string, RequestInit]>;
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

	it.each([
		['the status its body names', 429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' }],
		['a 400 when its body names none', 400, { message: 'Invite does not exist' }]
	])("answers Gauzy's refusal with %s, and signs nobody in", async (_case, status, body) => {
		const fetchMock = gauzyAnswers({ 'POST /invite/accept': { status, body } });

		const response = await POST(acceptRequest());

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toEqual(body);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(response.headers.get('set-cookie')).toBeNull();
	});

	it('refuses a body that is not JSON without calling Gauzy, so another site cannot sign the browser in', async () => {
		const fetchMock = gauzyAnswers({});

		const response = await POST(acceptRequest('text/plain'));

		expect(response.status).toBe(415);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
