import {
	DeleteResponse,
	ITaskRelatedIssueTypeCreate,
	ITaskRelatedIssueTypeItemList,
	PaginationResponse
} from '@app/interfaces';
import api, { get, post, put } from '../axios';

export function createTaskRelatedIssueTypeAPI(data: ITaskRelatedIssueTypeCreate, tenantId?: string) {
	return post<ITaskRelatedIssueTypeCreate>('/task-related-issue-types', data, {
		tenantId
	});
}

export function editTaskRelatedIssueTypeAPI(id: string, data: ITaskRelatedIssueTypeCreate, tenantId?: string) {
	return put<ITaskRelatedIssueTypeCreate>(`/task-related-issue-types/${id}`, data, {
		tenantId
	});
}

export function deleteTaskRelatedIssueTypeAPI(id: string) {
	return api.delete<DeleteResponse>(`/task-related-issue-types/${id}`);
}

export async function getTaskRelatedIssueTypeList(
	tenantId: string,
	organizationId: string,
	organizationTeamId: string | null
) {
	const endpoint = `/task-related-issue-types?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

	return get<PaginationResponse<ITaskRelatedIssueTypeItemList>>(endpoint, { tenantId });
}
