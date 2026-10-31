/**
 * Proxy mode: POST /api/task-estimation had no route and answered 404, so a member's estimate could not be added
 * from the task page.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { POST } from './route';

afterEach(restoreFetch);

describe('POST /api/task-estimation', () => {
	it("forwards the estimate to Gauzy's POST /task-estimation and answers what Gauzy answers", async () => {
		const estimate = { estimate: 7200, employeeId: 'employee-1', taskId: 'task-1' };
		const created = { id: 'estimation-1', ...estimate };
		const fetchMock = gauzyAnswers(Response.json(created, { status: 201 }));

		const response = await POST(signedInRequest('https://app.ever.team/api/task-estimation', 'POST', estimate));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/task-estimation'));
		expect(sent.method).toBe('POST');
		expect(sent.body).toEqual(estimate);
		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual(created);
	});
});
