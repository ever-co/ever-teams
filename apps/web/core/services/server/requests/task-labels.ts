import { ITag } from '@/core/types/interfaces/tag/tag';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { serverFetch } from '../fetch';
import qs from 'qs';

export function createLabelsRequest(datas: ITagCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<ITag>({
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
	datas: ITagCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITag>({
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
	return serverFetch<ITag>({
		path: `/tags/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskLabelsListRequest(
	{
		organizationId,
		tenantId,
		organizationTeamId: organizationTeamId
	}: { tenantId: string; organizationId: string; organizationTeamId: string | null },
	bearer_token: string
) {
	const params = qs.stringify({
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
