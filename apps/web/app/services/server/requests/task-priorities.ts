import {
	ITaskPrioritiesCreate,
	ITaskPrioritiesItemList
} from '@app/interfaces';
import { serverFetch } from '../fetch';

export function createPrioritiesRequest(
	datas: ITaskPrioritiesCreate,
	bearer_token: string,
	tenantId?: any
) {
	return serverFetch<ITaskPrioritiesItemList>({
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
	return serverFetch<ITaskPrioritiesItemList>({
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
	return serverFetch<ITaskPrioritiesItemList>({
		path: `/task-priorities/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskPrioritiesListRequest<ITaskStatusItemList>(
	{
		organizationId,
		tenantId,
		activeTeamId
	}: { tenantId: string; organizationId: string; activeTeamId: string | null },
	bearer_token: string
) {
	return serverFetch({
		path: `/task-priorities?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`,
		method: 'GET',
		bearer_token
	});
}
