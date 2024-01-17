import {
	CreateResponse,
	DeleteResponse,
	IIssueTypesCreate,
	IIssueTypesItemList,
	PaginationResponse
} from '@app/interfaces';
import api, { get, put } from '../axios';

export function createIssueTypeAPI(data: IIssueTypesCreate, tenantId?: string) {
	return api.post<CreateResponse<IIssueTypesCreate>>('/issue-types', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editIssueTypeAPI(id: string, data: IIssueTypesCreate, tenantId?: string) {
	return put<IIssueTypesCreate>(`/issue-types/${id}`, data, {
		tenantId
	});
}

export function deleteIssueTypeAPI(id: string) {
	return api.delete<DeleteResponse>(`/issue-types/${id}`);
}

export async function getIssueTypeList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	const endpoint = `/issue-types?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`;

	return get<PaginationResponse<IIssueTypesItemList>>(endpoint, { tenantId });
}
