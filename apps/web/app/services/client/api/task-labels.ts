import { CreateResponse, DeleteResponse, ITaskLabelsCreate } from '@app/interfaces';
import api from '../axios';

export function createTaskLabelsAPI(data: ITaskLabelsCreate, tenantId?: string) {
	return api.post<CreateResponse<ITaskLabelsCreate>>('/tags', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskLabelsAPI(id: string, data: ITaskLabelsCreate, tenantId?: string) {
	return api.put<CreateResponse<ITaskLabelsCreate>>(`/tags/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function deleteTaskLabelsAPI(id: string) {
	return api.delete<DeleteResponse>(`/tags/${id}`);
}

export function getTaskLabelsList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	return api.get(`/tags/level?tenantId=${tenantId}&organizationId=${organizationId}&activeTeamId=${activeTeamId}`);
}
