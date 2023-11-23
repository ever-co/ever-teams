import { CreateResponse, DeleteResponse, ITaskSizesCreate } from '@app/interfaces';
import api, { get } from '../axios';

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

export async function getTaskSizesList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	const endpoint = `/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`;
	return get(endpoint, true);
}
