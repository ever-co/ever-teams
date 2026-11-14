/**
 * Proxy mode: the signed-in user's sessions (ever-co/ever-gauzy#11943) are read through Gauzy with the session's
 * token, answered as Gauzy answers (a 404 from an API without the sessions route included) and marked no-store.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/auth/sessions';
const SESSION = {
	id: 'session-1',
	current: true,
	app: 'WEB',
	browser: 'Chrome 131',
	os: 'Windows',
	userAgent: null,
	ipAddress: null,
	signedInAt: '2026-11-10T08:00:00.000Z',
	lastActiveAt: '2026-11-14T09:00:00.000Z'
};

describe('GET /api/auth/sessions', () => {
	it("lists through Gauzy's GET /auth/sessions, marked no-store", async () => {
		const fetchMock = gauzyAnswers(Response.json([SESSION], { status: 200 }));

		const response = await GET(signedInRequest(URL));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/auth/sessions'));
		expect(sent.method).toBe('GET');
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual([SESSION]);
	});

	it("answers an API without the sessions route with Gauzy's 404, which the page reads as not available", async () => {
		const missing = { statusCode: 404, message: 'Cannot GET /api/auth/sessions' };
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
