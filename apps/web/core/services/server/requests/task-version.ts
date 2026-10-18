import { TTaskVersion, TTaskVersionCreate } from '@/core/types/schemas/task/task-version.schema';
import { serverFetch } from '../fetch';

export function createVersionRequest(datas: TTaskVersionCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<TTaskVersion>({
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
	datas: TTaskVersionCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<TTaskVersion>({
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
	return serverFetch<TTaskVersion>({
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
		path: `/task-versions?${query}`,
		method: 'GET',
		bearer_token
	});
}
