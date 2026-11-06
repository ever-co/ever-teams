/**
 * Proxy mode: PUT and DELETE /api/task-estimation/:id had no route and answered 404, so a member's estimate could
 * not be edited or removed from the task page.
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { DELETE, PUT } from './route';

afterEach(restoreFetch);

describe('/api/task-estimation/:id', () => {
	it("forwards an edit to Gauzy's PUT /task-estimation/:id and answers what Gauzy answers", async () => {
		const estimate = { id: 'estimation-1', estimate: 3600, employeeId: 'employee-1', taskId: 'task-1' };
		const fetchMock = gauzyAnswers(Response.json(estimate, { status: 200 }));
		const request = signedInRequest('https://app.ever.team/api/task-estimation/estimation-1', 'PUT', estimate);

		const response = await PUT(request, idParams('estimation-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/task-estimation/estimation-1'));
		expect(sent.method).toBe('PUT');
		expect(sent.body).toEqual(estimate);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(estimate);
	});

	it("forwards a delete to Gauzy's DELETE /task-estimation/:id and answers what Gauzy answers", async () => {
		const deleted = { raw: [], affected: 1 };
		const fetchMock = gauzyAnswers(Response.json(deleted, { status: 200 }));
		const request = signedInRequest('https://app.ever.team/api/task-estimation/estimation-1', 'DELETE');

		const response = await DELETE(request, idParams('estimation-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/task-estimation/estimation-1'));
		expect(sent.method).toBe('DELETE');
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(deleted);
	});
});
