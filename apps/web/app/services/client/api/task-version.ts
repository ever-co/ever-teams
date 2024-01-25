import { DeleteResponse, ITaskVersionCreate, ITaskVersionItemList, PaginationResponse } from '@app/interfaces';
import api, { get, post, put } from '../axios';

export function createTaskVersionAPI(data: ITaskVersionCreate, tenantId?: string) {
	return post<ITaskVersionCreate>('/task-versions', data, {
		tenantId
	});
}

export function editTaskVersionAPI(id: string, data: ITaskVersionCreate, tenantId?: string) {
	return put<ITaskVersionCreate>(`/task-versions/${id}`, data, {
		tenantId
	});
}

export function deleteTaskVersionAPI(id: string) {
	return api.delete<DeleteResponse>(`/task-versions/${id}`);
}

export async function getTaskVersionList(tenantId: string, organizationId: string, organizationTeamId: string | null) {
	const endpoint = `/task-versions?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

	return get<PaginationResponse<ITaskVersionItemList>>(endpoint, { tenantId });
}
