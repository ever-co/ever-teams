import { ITaskStatusCreate, ITaskStatus } from '@/core/types/interfaces/to-review';
import { serverFetch } from '../fetch';

export function createStatusRequest(datas: ITaskStatusCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<ITaskStatus>({
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
	return serverFetch<ITaskStatus>({
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
	return serverFetch<ITaskStatus>({
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
		organizationTeamId
	}: {
		tenantId: string;
		organizationId: string;
		organizationTeamId: string | null;
	},
	bearer_token: string
) {
	return serverFetch({
		path: `/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`,
		method: 'GET',
		bearer_token
	});
}
