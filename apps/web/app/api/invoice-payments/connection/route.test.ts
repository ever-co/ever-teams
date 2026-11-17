/**
 * @jest-environment node
 */
/**
 * Proxy mode: the payment connection's read can answer the connector's signing secret, so no cache keeps it, no other
 * site is let read it (the answer never says `Access-Control-Allow-Origin`), and a browser asks for it only from this
 * app's own pages. The write is covered with rotate-secret (`./rotate-secret/route.test.ts`).
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { APP_ORIGIN, FOREIGN_ORIGIN_HEADERS, SAME_ORIGIN_HEADERS } from '@/test/api/request-origin';
import { GET } from './route';

afterEach(restoreFetch);

const URL = `${APP_ORIGIN}/api/invoice-payments/connection`;

/** Gauzy's answer, with a CORS header the proxy must not pass on. */
function connectionAnswer() {
	return Response.json(
		{ connected: true, signingSecret: 'secret-shown-once' },
		{ status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
	);
}

describe('GET /api/invoice-payments/connection', () => {
	it("forwards a read of this app's pages, which no cache keeps and no other site may read", async () => {
		const fetchMock = gauzyAnswers(connectionAnswer());

		const response = await GET(signedInRequest(URL, 'GET', undefined, SAME_ORIGIN_HEADERS));

		const sent = sentToGauzy(fetchMock);
		expect([sent.url, sent.method]).toEqual([gauzyUrl('/invoice-payments/connection'), 'GET']);
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
	});

	it('answers a client that is no browser, which sends no Origin, after the session check alone', async () => {
		const fetchMock = gauzyAnswers(connectionAnswer());

		const response = await GET(signedInRequest(URL));

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each(FOREIGN_ORIGIN_HEADERS)('refuses a read from %s, without asking Gauzy', async (_label, headers) => {
		const fetchMock = gauzyAnswers(connectionAnswer());

		const response = await GET(signedInRequest(URL, 'GET', undefined, headers));

		expect(response.status).toBe(403);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
