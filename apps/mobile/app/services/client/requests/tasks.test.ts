import { serverFetch } from '../fetch';
import { getTaskByIdRequest, getTeamTasksRequest } from './tasks';

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

describe("the request for the team's task list", () => {
	beforeEach(() => {
		jest.mocked(serverFetch).mockClear();
	});

	// Linked issues and the creator are one-to-many joins that multiply the rows behind /tasks/team: with them a team of
	// eleven tasks took 31 s to answer on a bench, and the reads that piled up held every other request of the app
	it('asks only for what the lists show, as the web does, and leaves linked issues and the creator to the task page', async () => {
		await getTeamTasksRequest({
			tenantId: 't',
			organizationId: 'o',
			bearer_token: 'token',
			activeTeamId: 'team-1'
		});

		expect(relationsAskedFor()).toEqual(['tags', 'teams', 'members', 'members.user', 'parent', 'children']);
	});
});
