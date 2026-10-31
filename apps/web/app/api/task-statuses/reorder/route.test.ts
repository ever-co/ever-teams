/**
 * Proxy mode: PATCH /api/task-statuses/reorder fell on the task-statuses/[id] route, which has no PATCH, so saving
 * the order from the task statuses settings answered 405.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { PATCH } from './route';

afterEach(restoreFetch);

describe('PATCH /api/task-statuses/reorder', () => {
	it("forwards the new order to Gauzy's PATCH /task-statuses/reorder and answers what Gauzy answers", async () => {
		const order = {
			organizationId: 'org-1',
			reorder: [
				{ id: 'status-1', order: 2 },
				{ id: 'status-2', order: 1 }
			]
		};
		const reordered = {
			list: [
				{ id: 'status-2', order: 1 },
				{ id: 'status-1', order: 2 }
			]
		};
		const fetchMock = gauzyAnswers(Response.json(reordered, { status: 200 }));

		const response = await PATCH(
			signedInRequest('https://app.ever.team/api/task-statuses/reorder', 'PATCH', order)
		);

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/task-statuses/reorder'));
		expect(sent.method).toBe('PATCH');
		expect(sent.body).toEqual(order);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(reordered);
	});
});
