import { ITeamTask } from '@ever-teams/toolkit-types';
import { Identity } from './identity';
import { Transport } from './transport';

export interface TasksListParams {
	/** Only the tasks of this project. */
	projectId?: string;
}

export interface TasksResource {
	/** GET /tasks/employee/:employeeId: the tasks of the token's member, in one project when it is given. */
	list(params?: TasksListParams): Promise<ITeamTask[]>;
}

export function createTasks(transport: Transport, identity: Identity): TasksResource {
	async function list(params: TasksListParams = {}): Promise<ITeamTask[]> {
		const { tenantId, organizationId, employeeId } = await identity.member();
		return transport.request<ITeamTask[]>({
			method: 'GET',
			path: `/tasks/employee/${encodeURIComponent(employeeId)}`,
			query: { where: { organizationId, tenantId, projectId: params.projectId } },
			tenantId,
			organizationId
		});
	}

	return { list };
}
