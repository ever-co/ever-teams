import { CreateResponse, DeleteResponse, ITaskSizesCreate } from '@app/interfaces';
import api from '../axios';

export function createTaskSizesAPI(data: ITaskSizesCreate, tenantId?: string) {
	return api.post<CreateResponse<ITaskSizesCreate>>('/task-sizes', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskSizesAPI(id: string, data: ITaskSizesCreate, tenantId?: string) {
	return api.put<CreateResponse<ITaskSizesCreate>>(`/task-sizes/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function deleteTaskSizesAPI(id: string) {
	return api.delete<DeleteResponse>(`/task-sizes/${id}`);
}

export function getTaskSizesList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	return api.get(`/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}&activeTeamId=${activeTeamId}`);
}
