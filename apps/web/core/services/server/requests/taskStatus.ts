import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { serverFetch } from '../fetch';
import { ITaskStatusCreate } from '@/core/types/interfaces/task/task-status/task-status';

export function createStatusRequest(datas: ITaskStatusCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<ETaskStatusName>({
		path: '/task-statuses',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function editTaskStatusRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: ITaskStatusCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ETaskStatusName>({
		path: `/task-statuses/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function deleteTaskStatusRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ETaskStatusName>({
		path: `/task-statuses/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskStatusListRequest(
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
		path: `/task-statuses?${query}`,
		method: 'GET',
		bearer_token
	});
}
