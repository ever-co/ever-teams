/**
 * Proxy mode: the sign-in of one site the signed-in person allowed (#5595) is ended through Gauzy's
 * DELETE /embed/grants/:id, which answers 404 for a sign-in that is gone or is another person's.
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { FOREIGN_ORIGIN_HEADERS } from '@/test/api/request-origin';
import { DELETE } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/embed/grants/grant-1';

describe('DELETE /api/embed/grants/:id', () => {
	it("ends the sign-in through Gauzy's DELETE /embed/grants/:id", async () => {
		const fetchMock = gauzyAnswers(new Response(null, { status: 204 }));

		const response = await DELETE(signedInRequest(URL, 'DELETE'), idParams('grant-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/embed/grants/grant-1'));
		expect(sent.method).toBe('DELETE');
		expect(response.status).toBe(204);
	});

	it("answers Gauzy's 404 for a sign-in that is already gone as it is", async () => {
		const missing = { statusCode: 404, message: 'Not Found' };
		gauzyAnswers(Response.json(missing, { status: 404 }));

		const response = await DELETE(signedInRequest(URL, 'DELETE'), idParams('grant-1'));

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual(missing);
	});

	it('keeps the id one path segment', async () => {
		const fetchMock = gauzyAnswers(new Response(null, { status: 204 }));

		await DELETE(signedInRequest(URL, 'DELETE'), idParams('../x'));

		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/embed/grants/..%2Fx'));
	});

	it.each(FOREIGN_ORIGIN_HEADERS)('refuses %s before anything reaches Gauzy', async (_label, headers) => {
		const fetchMock = gauzyAnswers(new Response(null, { status: 204 }));

		const response = await DELETE(signedInRequest(URL, 'DELETE', undefined, headers), idParams('grant-1'));

		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('sends nothing for a browser without a session', async () => {
		const fetchMock = gauzyAnswers(new Response(null, { status: 204 }));

		const response = await DELETE(new Request(URL, { method: 'DELETE' }), idParams('grant-1'));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
