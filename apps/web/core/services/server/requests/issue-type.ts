import { IIssueType, IIssueTypesCreate } from '@/core/types/interfaces/task/issue-type';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { serverFetch } from '../fetch';

export function createIssueTypeRequest(datas: IIssueTypesCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<IIssueType>({
		path: '/issue-types',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function editIssueTypesRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: IIssueTypesCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<IIssueType>({
		path: `/issue-types/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function deleteIssueTypesRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<IIssueType>({
		path: `/issue-types/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getIssueTypesListRequest(
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

	return serverFetch<PaginationResponse<IIssueType>>({
		path: `/issue-types?${query}`,
		method: 'GET',
		bearer_token
	});
}
