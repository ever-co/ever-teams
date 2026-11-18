import { Identity } from './identity';
import { Transport } from './transport';

/** A task of the member, with the fields GET /tasks/employee/:employeeId answers: none of its relations. */
export interface EverTeamsTask {
	id: string;
	tenantId: string;
	organizationId: string;
	projectId: string | null;
	parentId: string | null;
	title: string;
	number: number | null;
	prefix: string | null;
	/** The prefix and the number, as the app shows them. */
	taskNumber: string;
	description: string | null;
	// Each organization names its own statuses, priorities, sizes and types: text, or null when the task has none.
	status: string | null;
	priority: string | null;
	size: string | null;
	issueType: string | null;
	/** In seconds. */
	estimate: number | null;
	startDate: string | null;
	dueDate: string | null;
	resolvedAt: string | null;
	version: string | null;
	public: boolean;
	isDraft: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface TasksListParams {
	/** Only the tasks of this project. */
	projectId?: string;
}

export interface TasksResource {
	/** GET /tasks/employee/:employeeId: the tasks of the token's member, in one project when it is given. */
	list(params?: TasksListParams): Promise<EverTeamsTask[]>;
}

export function createTasks(transport: Transport, identity: Identity): TasksResource {
	async function list(params: TasksListParams = {}): Promise<EverTeamsTask[]> {
		const { tenantId, organizationId, employeeId } = await identity.member();
		return transport.request<EverTeamsTask[]>({
			method: 'GET',
			path: `/tasks/employee/${encodeURIComponent(employeeId)}`,
			query: { where: { organizationId, tenantId, projectId: params.projectId } },
			tenantId,
			organizationId
		});
	}

	return { list };
}
