/**
 * Proxy mode: DELETE /api/organization-projects/:id answered 405 because the route only had GET and PUT, and the
 * delete hook swallowed the error, so the project stayed.
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

describe('DELETE /api/organization-projects/:id', () => {
	it('forwards the delete to Gauzy with the session and answers its 204 with no body, as the client expects', async () => {
		const fetchMock = gauzyAnswers(new Response(null, { status: 204 }));
		const request = signedInRequest('https://app.ever.team/api/organization-projects/project-1', 'DELETE');

		const response = await DELETE(request, idParams('project-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/organization-projects/project-1'));
		expect(sent.method).toBe('DELETE');
		expect(sent.body).toBeUndefined();
		expect(response.status).toBe(204);
		await expect(response.text()).resolves.toBe('');
	});
});
