/**
 * Proxy mode: the signed-in user's address verification status is read through Gauzy with the session's token, and a
 * deployment that verifies no address keeps Gauzy's 404, which tells the app to ask nobody for a code.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/auth/verify/status';

describe('GET /api/auth/verify/status', () => {
	it("reads Gauzy's GET /auth/email/verify/status, marked no-store", async () => {
		const status = { isEmailVerified: false, verificationEmailSent: true };
		const fetchMock = gauzyAnswers(Response.json(status, { status: 200 }));

		const response = await GET(signedInRequest(URL));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/auth/email/verify/status'));
		expect(sent.method).toBe('GET');
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual(status);
	});

	it("keeps Gauzy's 404 where the deployment verifies no address", async () => {
		const switchedOff = { statusCode: 404, message: 'Cannot GET /api/auth/email/verify/status' };
		gauzyAnswers(Response.json(switchedOff, { status: 404 }));

		const response = await GET(signedInRequest(URL));

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual(switchedOff);
	});

	it('sends nothing for a browser without a session', async () => {
		const fetchMock = gauzyAnswers(Response.json({ isEmailVerified: true }, { status: 200 }));

		const response = await GET(new Request(URL));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
