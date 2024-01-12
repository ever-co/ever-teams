import {
	CreateResponse,
	DeleteResponse,
	ITaskStatusCreate,
	ITaskStatusItemList,
	PaginationResponse
} from '@app/interfaces';
import api, { get } from '../axios';

export function createTaskStatusAPI(data: ITaskStatusCreate, tenantId?: string) {
	return api.post<CreateResponse<ITaskStatusCreate>>('/task-statuses', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskStatusAPI(id: string, data: ITaskStatusCreate, tenantId?: string) {
	return api.put<CreateResponse<ITaskStatusCreate>>(`/task-statuses/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function deleteTaskStatusAPI(id: string) {
	return api.delete<DeleteResponse>(`/task-statuses/${id}`);
}

export async function getTaskStatusList(tenantId: string, organizationId: string, organizationTeamId: string | null) {
	const endpoint = `/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

	return get<PaginationResponse<ITaskStatusItemList>>(endpoint, { tenantId });
}
