import { CreateReponse, DeleteReponse, ITaskRelatedIssueTypeCreate } from '@app/interfaces';
import api from '../axios';

export function createTaskRelatedIssueTypeAPI(data: ITaskRelatedIssueTypeCreate, tenantId?: string) {
	return api.post<CreateReponse<ITaskRelatedIssueTypeCreate>>('/task-related-issue-types', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskRelatedIssueTypeAPI(id: string, data: ITaskRelatedIssueTypeCreate, tenantId?: string) {
	return api.put<CreateReponse<ITaskRelatedIssueTypeCreate>>(`/task-related-issue-types/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function deleteTaskRelatedIssueTypeAPI(id: string) {
	return api.delete<DeleteReponse>(`/task-related-issue-types/${id}`);
}

export function getTaskRelatedIssueTypeList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	return api.get(
		`/task-related-issue-types?tenantId=${tenantId}&organizationId=${organizationId}&activeTeamId=${activeTeamId}`
	);
}
