import { serverFetch } from '../fetch';
import { getTaskByIdRequest } from './tasks';

jest.mock('../fetch', () => ({ serverFetch: jest.fn(() => Promise.resolve({ data: {}, response: { ok: true } })) }));

function relationsAskedFor(): string[] {
	const [request] = jest.mocked(serverFetch).mock.calls[0];
	const query = new URLSearchParams(request.path.split('?')[1]);
	return [...query.entries()].filter(([name]) => name.startsWith('relations[')).map(([, relation]) => relation);
}

describe('the request for one task', () => {
	beforeEach(() => {
		jest.mocked(serverFetch).mockClear();
	});

	it("asks for the task's creator by the name Gauzy gives it, which keeps the whole answer from failing", async () => {
		await getTaskByIdRequest({ tenantId: 't', organizationId: 'o', bearer_token: 'token', taskId: 'task-1' });

		expect(relationsAskedFor()).toContain('createdByUser');
		expect(relationsAskedFor()).not.toContain('creator');
	});

	it('still asks for the members, the links and the parent the task screen shows', async () => {
		await getTaskByIdRequest({ tenantId: 't', organizationId: 'o', bearer_token: 'token', taskId: 'task-1' });

		expect(relationsAskedFor()).toEqual(
			expect.arrayContaining(['members', 'members.user', 'linkedIssues', 'parent', 'children'])
		);
	});
});
