/**
 * Proxy mode: "Sign out other sessions" goes on to Gauzy with the proof as sent, and Gauzy's refusals come back as they
 * are (a `{ code, message }` body, without a statusCode), so the page can tell a wrong password from a missing code.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { POST } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/auth/sessions/sign-out-others';

describe('POST /api/auth/sessions/sign-out-others', () => {
	it("forwards the proof to Gauzy's POST /auth/sessions/sign-out-others and answers how many went", async () => {
		const fetchMock = gauzyAnswers(Response.json({ signedOut: 1 }, { status: 200 }));

		const response = await POST(signedInRequest(URL, 'POST', { password: 'secret-1' }));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/auth/sessions/sign-out-others'));
		expect(sent.method).toBe('POST');
		expect(sent.body).toEqual({ password: 'secret-1' });
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual({ signedOut: 1 });
	});

	it.each([
		[400, { code: 'SESSION_CONFIRMATION_INVALID', message: 'The password or the code is not right.' }],
		[400, { code: 'SESSION_CONFIRMATION_REQUIRED', message: 'This account needs its password.' }],
		[409, { code: 'SESSION_SIGN_OUT_INCOMPLETE', message: 'Try again.' }],
		[429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' }]
	])("answers Gauzy's %i as it is", async (status, refusal) => {
		gauzyAnswers(Response.json(refusal, { status }));

		const response = await POST(signedInRequest(URL, 'POST', { password: 'wrong' }));

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toEqual(refusal);
	});

	it('sends nothing for a browser without a session', async () => {
		const fetchMock = gauzyAnswers(Response.json({ signedOut: 0 }, { status: 200 }));

		const response = await POST(new Request(URL, { method: 'POST' }));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
