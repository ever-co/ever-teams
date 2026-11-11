import { ITag, ITagBulkResult } from '@/core/types/interfaces/tag/tag';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import type { TTagCreate } from '@/core/types/schemas/tag/tag.schema';
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

/** Many labels in one request: Gauzy files each item as `POST /tags` would, and answers one outcome per item. */
export function createLabelsBulkRequest(items: ReadonlyArray<TTagCreate>, bearer_token: string, tenantId?: string) {
	return serverFetch<ITagBulkResult>({
		path: '/tags/bulk',
		method: 'POST',
		body: { items },
		bearer_token,
		tenantId
	});
}
