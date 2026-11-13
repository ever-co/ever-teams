/**
 * Proxy mode: DELETE /api/tasks/:id/trashed is the twin of the platform's `DELETE /tasks/:id/trashed`, which deletes
 * a task for good only while it is in the trash. The trash's Delete forever used the plain delete, which also deletes
 * a task someone restored meanwhile; its 404 for such a task must reach the browser as it is.
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

const SCOPE = '?tenantId=tenant-1&organizationId=organization-1';

describe('/api/tasks/:id/trashed', () => {
	it("forwards Delete forever to Gauzy's DELETE /tasks/:id/trashed with the scope, and answers what Gauzy answers", async () => {
		const deleted = { raw: [], affected: 1 };
		const fetchMock = gauzyAnswers(Response.json(deleted, { status: 200 }));
		const request = signedInRequest(`https://app.ever.team/api/tasks/task-1/trashed${SCOPE}`, 'DELETE');

		const response = await DELETE(request, idParams('task-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl(`/tasks/task-1/trashed${SCOPE}`));
		expect(sent.method).toBe('DELETE');
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(deleted);
	});

	it('answers the platform’s 404 for a task that is no longer in the trash as it is', async () => {
		const notInTrash = { statusCode: 404, message: 'TASK_NOT_IN_TRASH: no task with that id is in the trash' };
		gauzyAnswers(Response.json(notInTrash, { status: 404 }));
		const request = signedInRequest(`https://app.ever.team/api/tasks/task-1/trashed${SCOPE}`, 'DELETE');

		const response = await DELETE(request, idParams('task-1'));

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual(notInTrash);
	});

	it('keeps the id one path segment, so it cannot reach another endpoint', async () => {
		const fetchMock = gauzyAnswers(Response.json({ raw: [], affected: 0 }, { status: 200 }));
		const request = signedInRequest('https://app.ever.team/api/tasks/x/trashed', 'DELETE');

		await DELETE(request, idParams('../x'));

		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/tasks/..%2Fx/trashed'));
	});
});
