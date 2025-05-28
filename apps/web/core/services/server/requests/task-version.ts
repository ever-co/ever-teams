import { ITaskVersionCreate, ITaskVersion } from '@/core/types/interfaces/to-review';
import { serverFetch } from '../fetch';

export function createVersionRequest(datas: ITaskVersionCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<ITaskVersion>({
		path: '/task-versions',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function editTaskVersionRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: ITaskVersionCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITaskVersion>({
		path: `/task-versions/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function deleteTaskVersionRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ITaskVersion>({
		path: `/task-versions/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskVersionListRequest(
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
		path: `/task-versions?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`,
		method: 'GET',
		bearer_token
	});
}
