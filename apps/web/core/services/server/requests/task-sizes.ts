import { ITaskSizesCreate, ITaskSizesItemList } from '@/core/types/interfaces';
import { serverFetch } from '../fetch';

export function createSizesRequest(datas: ITaskSizesCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<ITaskSizesItemList>({
		path: '/task-sizes',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function editTaskSizesRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: ITaskSizesCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITaskSizesItemList>({
		path: `/task-sizes/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function deleteTaskSizesRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ITaskSizesItemList>({
		path: `/task-sizes/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskSizesListRequest(
	{
		organizationId,
		tenantId,
		organizationTeamId
	}: { tenantId: string; organizationId: string; organizationTeamId: string | null },
	bearer_token: string
) {
	return serverFetch({
		path: `/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`,
		method: 'GET',
		bearer_token
	});
}
