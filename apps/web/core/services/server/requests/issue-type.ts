import { IIssueTypesCreate, IIssueTypesItemList, PaginationResponse } from '@/core/types/interfaces/to-review';
import { serverFetch } from '../fetch';

export function createIssueTypeRequest(datas: IIssueTypesCreate, bearer_token: string, tenantId?: any) {
	return serverFetch<IIssueTypesItemList>({
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
	return serverFetch<IIssueTypesItemList>({
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
	return serverFetch<IIssueTypesItemList>({
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
		organizationTeamId
	}: { tenantId: string; organizationId: string; organizationTeamId: string | null },
	bearer_token: string
) {
	return serverFetch<PaginationResponse<IIssueTypesItemList>>({
		path: `/issue-types?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`,
		method: 'GET',
		bearer_token
	});
}
