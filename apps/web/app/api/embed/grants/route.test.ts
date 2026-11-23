/**
 * Proxy mode: the sites the signed-in person allowed to use their timer (#5595) are read through Gauzy with the
 * session's token, answered as Gauzy answers (the 404 of a server without embeds included) and marked no-store.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/embed/grants';
const GRANT = {
	id: 'grant-1',
	origin: 'https://team.example.com',
	organizationId: 'organization-1',
	userId: 'user-1',
	employeeId: 'employee-1',
	renewedAt: '2026-11-20T09:00:00.000Z',
	expiresAt: '2026-12-20T09:00:00.000Z'
};

describe('GET /api/embed/grants', () => {
	it("lists through Gauzy's GET /embed/grants, marked no-store", async () => {
		const fetchMock = gauzyAnswers(Response.json([GRANT], { status: 200 }));

		const response = await GET(signedInRequest(URL));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/embed/grants'));
		expect(sent.method).toBe('GET');
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual([GRANT]);
	});

	it("answers a server without embeds with Gauzy's 404, which the page reads as not available", async () => {
		const missing = { statusCode: 404, message: 'Cannot GET /api/embed/grants' };
		gauzyAnswers(Response.json(missing, { status: 404 }));

		const response = await GET(signedInRequest(URL));

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual(missing);
	});

	it('sends nothing for a browser without a session', async () => {
		const fetchMock = gauzyAnswers(Response.json([], { status: 200 }));

		const response = await GET(new Request(URL));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
