/**
 * @jest-environment node
 */
/**
 * DELETE /api/tasks/employee/:employeeId (#5727): the API answers this unassignment 200 with an empty body. The route
 * handed that to a JSON answer, which threw, so removing a member said "That change was not saved" although it was.
 */
const mockAuthenticatedGuard = jest.fn();
const mockDeleteFromTasks = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	deleteEmployeeFromTasksRequest: (...args: unknown[]) => mockDeleteFromTasks(...args),
	getEmployeeTasksRequest: jest.fn()
}));

import { DELETE } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1'
};

function unassign() {
	const request = new Request('https://app.example.com/api/tasks/employee/employee-1?organizationTeamId=team-1', {
		method: 'DELETE',
		headers: { origin: 'https://app.example.com' }
	});
	return DELETE(request, { params: Promise.resolve({ employeeId: 'employee-1' }) } as never);
}

/** What serverFetch throws for an answer that is not 2xx: a rejected promise of the API's error body. */
function refusalOf(body: unknown) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

describe('DELETE /api/tasks/employee/:employeeId', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	});

	it('answers 200 when the API accepted the unassignment with an empty body', async () => {
		mockDeleteFromTasks.mockResolvedValue({ data: undefined, response: { status: 200 } });

		const response = (await unassign()) as Response;

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('');
		expect(mockDeleteFromTasks).toHaveBeenCalledWith({
			employeeId: 'employee-1',
			organizationTeamId: 'team-1',
			tenantId: 'tenant-1',
			bearer_token: 'session-token'
		});
	});

	it('passes on what the API answered when it answers a body', async () => {
		mockDeleteFromTasks.mockResolvedValue({ data: { affected: 2 }, response: { status: 200 } });

		const response = (await unassign()) as Response;

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ affected: 2 });
	});

	it('passes a refusal of the API on with its status', async () => {
		mockDeleteFromTasks.mockRejectedValue(refusalOf({ statusCode: 403, message: 'Forbidden resource' }));

		const response = (await unassign()) as Response;

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden resource' });
	});
});
