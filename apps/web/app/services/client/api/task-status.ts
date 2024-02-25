import { DeleteResponse, ITaskStatusCreate, ITaskStatusItemList, PaginationResponse } from '@app/interfaces';
import { deleteApi, get, post, put } from '../axios';

export function createTaskStatusAPI(data: ITaskStatusCreate, tenantId?: string) {
	return post<ITaskStatusCreate>('/task-statuses', data, {
		tenantId
	});
}

export function editTaskStatusAPI(id: string, data: ITaskStatusCreate, tenantId?: string) {
	return put<ITaskStatusCreate>(`/task-statuses/${id}`, data, {
		tenantId
	});
}

export function deleteTaskStatusAPI(id: string) {
	return deleteApi<DeleteResponse>(`/task-statuses/${id}`);
}

export async function getTaskStatusList(tenantId: string, organizationId: string, organizationTeamId: string | null) {
	const endpoint = `/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

	return get<PaginationResponse<ITaskStatusItemList>>(endpoint, { tenantId });
}
