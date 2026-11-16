/**
 * @jest-environment node
 */
/**
 * Proxy mode: the payment connector's signing secret is rotated only from this app's own pages. The request has no
 * body, so another site (a sibling subdomain, or any site where the cookies are SameSite=None) could post it with the
 * session's cookies without a CORS preflight, and every notification the connector signs would then be refused.
 */
import { TENANT_ID_COOKIE_NAME, TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { PUT } from '../route';
import { POST } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/invoice-payments/connection/rotate-secret';
const CONNECTION_URL = 'https://app.ever.team/api/invoice-payments/connection';

/** A request with the session's cookies, sent from another page than this app's. */
function foreignRequest(url: string, method: string, headers: Record<string, string>): Request {
	return new Request(url, {
		method,
		headers: { cookie: `${TOKEN_COOKIE_NAME}=session-token-1; ${TENANT_ID_COOKIE_NAME}=tenant-1`, ...headers }
	});
}

describe('POST /api/invoice-payments/connection/rotate-secret (ever-co/ever-gauzy#11856)', () => {
	it("forwards a request of this app's pages to Gauzy, and no cache keeps the new secret", async () => {
		const fetchMock = gauzyAnswers(
			Response.json({ connected: true, signingSecret: 'new-secret' }, { status: 200 })
		);

		const response = await POST(signedInRequest(URL, 'POST'));

		const sent = sentToGauzy(fetchMock);
		expect([sent.url, sent.method]).toEqual([gauzyUrl('/invoice-payments/connection/rotate-secret'), 'POST']);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it.each([
		['another site', { 'sec-fetch-site': 'cross-site' }],
		['a sibling subdomain', { 'sec-fetch-site': 'same-site' }],
		['another origin', { origin: 'https://evil.example.net' }]
	])('refuses a request from %s, without asking Gauzy', async (_label, headers) => {
		const fetchMock = gauzyAnswers(Response.json({ connected: true }, { status: 200 }));

		const response = await POST(foreignRequest(URL, 'POST', headers));

		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refuses a change of the connection from another site too', async () => {
		const fetchMock = gauzyAnswers(Response.json({ connected: true }, { status: 200 }));

		const response = await PUT(foreignRequest(CONNECTION_URL, 'PUT', { 'sec-fetch-site': 'cross-site' }));

		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
