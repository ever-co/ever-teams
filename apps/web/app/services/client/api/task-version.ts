import { CreateResponse, DeleteResponse, ITaskVersionCreate } from '@app/interfaces';
import api from '../axios';

export function createTaskVersionAPI(data: ITaskVersionCreate, tenantId?: string) {
	return api.post<CreateResponse<ITaskVersionCreate>>('/task-versions', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskVersionAPI(id: string, data: ITaskVersionCreate, tenantId?: string) {
	return api.put<CreateResponse<ITaskVersionCreate>>(`/task-versions/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function deleteTaskVersionAPI(id: string) {
	return api.delete<DeleteResponse>(`/task-versions/${id}`);
}

export function getTaskVersionList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	return api.get(`/task-versions?tenantId=${tenantId}&organizationId=${organizationId}&activeTeamId=${activeTeamId}`);
}
