import { CreateResponse, DeleteResponse, ITaskRelatedIssueTypeCreate } from '@app/interfaces';
import api, { get } from '../axios';

export function createTaskRelatedIssueTypeAPI(data: ITaskRelatedIssueTypeCreate, tenantId?: string) {
	return api.post<CreateResponse<ITaskRelatedIssueTypeCreate>>('/task-related-issue-types', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskRelatedIssueTypeAPI(id: string, data: ITaskRelatedIssueTypeCreate, tenantId?: string) {
	return api.put<CreateResponse<ITaskRelatedIssueTypeCreate>>(`/task-related-issue-types/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
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

	const data = await get(endpoint, true, { tenantId });

	return data;	
}
