import { CreateResponse, DeleteResponse, ITaskLabelsCreate } from '@app/interfaces';
import api, { get } from '../axios';

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

export async function getTaskLabelsList(tenantId: string, organizationId: string, organizationTeamId: string | null) {
	const endpoint = `/tags/level?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;
	const data = await get(endpoint, true, { tenantId });

	return data;
}
