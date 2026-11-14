/**
 * Proxy mode: one session of the signed-in user is signed out through Gauzy's DELETE /auth/sessions/:id, which
 * refuses another user's session and the request's own one itself.
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { DELETE } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/auth/sessions/session-2';

describe('DELETE /api/auth/sessions/:id', () => {
	it("signs the session out through Gauzy's DELETE /auth/sessions/:id", async () => {
		const fetchMock = gauzyAnswers(new Response(null, { status: 204 }));

		const response = await DELETE(signedInRequest(URL, 'DELETE'), idParams('session-2'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/auth/sessions/session-2'));
		expect(sent.method).toBe('DELETE');
		expect(response.status).toBe(204);
	});

	it("answers Gauzy's refusal of the request's own session as it is", async () => {
		const refusal = { code: 'SESSION_IS_CURRENT', message: 'Sign out with POST /api/auth/logout instead.' };
		gauzyAnswers(Response.json(refusal, { status: 400 }));

		const response = await DELETE(signedInRequest(URL, 'DELETE'), idParams('session-1'));

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual(refusal);
	});

	it('keeps the id one path segment', async () => {
		const fetchMock = gauzyAnswers(new Response(null, { status: 204 }));

		await DELETE(signedInRequest(URL, 'DELETE'), idParams('../x'));

		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/auth/sessions/..%2Fx'));
	});

	it('sends nothing for a browser without a session', async () => {
		const fetchMock = gauzyAnswers(new Response(null, { status: 204 }));

		const response = await DELETE(new Request(URL, { method: 'DELETE' }), idParams('session-2'));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
