import { DeleteResponse, IIssueTypesCreate, IIssueTypesItemList, PaginationResponse } from '@app/interfaces';
import { deleteApi, get, post, put } from '../axios';

export function createIssueTypeAPI(data: IIssueTypesCreate, tenantId?: string) {
	return post<IIssueTypesCreate>('/issue-types', data, {
		tenantId
	});
}

export function editIssueTypeAPI(id: string, data: IIssueTypesCreate, tenantId?: string) {
	return put<IIssueTypesCreate>(`/issue-types/${id}`, data, {
		tenantId
	});
}

export function deleteIssueTypeAPI(id: string) {
	return deleteApi<DeleteResponse>(`/issue-types/${id}`);
}

export async function getIssueTypeList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	const endpoint = `/issue-types?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`;

	return get<PaginationResponse<IIssueTypesItemList>>(endpoint, { tenantId });
}
