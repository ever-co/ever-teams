import { CreateResponse, DeleteResponse, ITaskStatusCreate } from '@app/interfaces';
import api from '../axios';

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

export function getTaskStatusList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	return api.get(`/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}&activeTeamId=${activeTeamId}`);
}
