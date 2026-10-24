import { ITaskPriority, ITaskPrioritiesCreate } from '@/core/types/interfaces/task/task-priority';
import { serverFetch } from '../fetch';

export function createPrioritiesRequest(datas: ITaskPrioritiesCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<ITaskPriority>({
		path: '/task-priorities',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function editTaskPrioritiesRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: ITaskPrioritiesCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITaskPriority>({
		path: `/task-priorities/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function deleteTaskPrioritiesRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ITaskPriority>({
		path: `/task-priorities/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskPrioritiesListRequest(
	{
		organizationId,
		tenantId,
		organizationTeamId,
		projectId
	}: {
		tenantId: string;
		organizationId: string;
		organizationTeamId: string | null;
		projectId?: string | null;
	},
	bearer_token: string
) {
	const query = new URLSearchParams({
		tenantId,
		organizationId,
		organizationTeamId: organizationTeamId ?? 'null'
	});
	if (projectId !== undefined && projectId !== null) query.set('projectId', projectId);

	return serverFetch({
		path: `/task-priorities?${query}`,
		method: 'GET',
		bearer_token
	});
}
