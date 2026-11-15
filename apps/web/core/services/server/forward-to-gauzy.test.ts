/**
 * `forwardToGauzy`'s header rule: a route names the request headers it lets through (`forwardHeaders`); the session's
 * own headers are always the proxy's, never the browser's copy.
 */
import { gauzyAnswers, restoreFetch, signedInRequest } from '@/test/api/forward-to-gauzy';
import { forwardToGauzy } from './forward-to-gauzy';

afterEach(restoreFetch);

function sentHeaders(fetchMock: jest.Mock): Record<string, string> {
	return (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
}

function withHeaders(request: Request, headers: Record<string, string>): Request {
	const merged = new Headers(request.headers);
	for (const [name, value] of Object.entries(headers)) merged.set(name, value);
	return new Request(request, { headers: merged });
}

describe('forwardToGauzy forwardHeaders', () => {
	it('forwards only the headers the route names, under their lower-case names', async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 200 }));
		const request = withHeaders(signedInRequest('https://app.ever.team/api/x', 'POST', { a: 1 }), {
			'Idempotency-Key': 'k-1',
			'X-Other': 'no'
		});

		await forwardToGauzy(request, '/x', { forwardHeaders: ['Idempotency-Key'] });

		const headers = sentHeaders(fetchMock);
		expect(headers['idempotency-key']).toBe('k-1');
		expect(headers).not.toHaveProperty('x-other');
	});

	it('forwards nothing extra by default', async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 200 }));
		const request = withHeaders(signedInRequest('https://app.ever.team/api/x', 'POST', { a: 1 }), {
			'Idempotency-Key': 'k-1'
		});

		await forwardToGauzy(request, '/x');

		expect(sentHeaders(fetchMock)).not.toHaveProperty('idempotency-key');
	});

	it("never lets the browser's copy of a session header replace the proxy's", async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 200 }));
		const request = withHeaders(signedInRequest('https://app.ever.team/api/x', 'POST', { a: 1 }), {
			Authorization: 'Bearer someone-else',
			'Tenant-Id': 'other-tenant'
		});

		await forwardToGauzy(request, '/x', { forwardHeaders: ['authorization', 'tenant-id', 'cookie'] });

		const headers = sentHeaders(fetchMock);
		expect(headers['authorization']).toBe('Bearer session-token-1');
		expect(headers['tenant-id']).toBe('tenant-1');
		expect(headers).not.toHaveProperty('cookie');
	});
});

/** A tab working in its own organization while the session in the cookies is in another one (#5134). */
describe('forwardToGauzy, a tab working in its own organization', () => {
	const jwt = (organizationId: string, userId = 'user-1') => {
		const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
		const issuedAt = Math.floor(Date.now() / 1000);
		const payload = { id: userId, tenantId: 'tenant-1', organizationId, iat: issuedAt, exp: issuedAt + 3600 };
		return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.sig-${organizationId}-${userId}`;
	};
	// Built once: a token built again a second later would differ from it
	const sharedToken = jwt('org-b');
	const tabRequest = (authorization: string) =>
		new Request('https://app.ever.team/api/timer/started-at', {
			method: 'PUT',
			headers: {
				cookie: `auth-token=${sharedToken}; auth-tenant-id=tenant-1; auth-organization-id=org-b`,
				authorization: `Bearer ${authorization}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({ startedAt: '2026-11-15T10:00:00.000Z' })
		});

	it("sends Gauzy the tab's own token, so it changes the tab's own timer", async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 200 }));
		const tabToken = jwt('org-a');

		await forwardToGauzy(tabRequest(tabToken), '/timesheet/timer/started-at');

		expect(sentHeaders(fetchMock).authorization).toBe(`Bearer ${tabToken}`);
	});

	it("sends the cookies' token for another person's token", async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 200 }));

		await forwardToGauzy(tabRequest(jwt('org-a', 'user-2')), '/timesheet/timer/started-at');

		expect(sentHeaders(fetchMock).authorization).toBe(`Bearer ${sharedToken}`);
	});
});
