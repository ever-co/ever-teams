import { CreateResponse, DeleteResponse, ITaskVersionCreate } from '@app/interfaces';
import api, { get } from '../axios';

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

export async function getTaskVersionList(tenantId: string, organizationId: string, organizationTeamId: string | null) {
	const endpoint = `/task-versions?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

	const data = await get(endpoint, true, { tenantId });

	return data;
}
