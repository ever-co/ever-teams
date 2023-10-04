import { ITaskLabelsCreate, ITaskLabelsItemList } from '@app/interfaces';
import { serverFetch } from '../fetch';

export function createLabelsRequest(
	datas: ITaskLabelsCreate,
	bearer_token: string,
	tenantId?: any
) {
	return serverFetch<ITaskLabelsItemList>({
		path: '/tags',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function editTaskLabelsRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: ITaskLabelsCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITaskLabelsItemList>({
		path: `/tags/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function deleteTaskLabelsRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ITaskLabelsItemList>({
		path: `/tags/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskLabelsListRequest<ITaskStatusItemList>(
	{
		organizationId,
		tenantId,
		activeTeamId: organizationTeamId
	}: { tenantId: string; organizationId: string; activeTeamId: string | null },
	bearer_token: string
) {
	const params = new URLSearchParams({
		tenantId,
		organizationId,
		organizationTeamId: organizationTeamId || ''
	});

	return serverFetch({
		path: `/tags/level?${params.toString()}`,
		method: 'GET',
		bearer_token
	});
}
