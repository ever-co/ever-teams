import { DeleteResponse, ITaskLabelsCreate, ITaskLabelsItemList, PaginationResponse } from '@app/interfaces';
import { deleteApi, get, post, put } from '../axios';

export function createTaskLabelsAPI(data: ITaskLabelsCreate, tenantId?: string) {
	return post<ITaskLabelsCreate>('/tags', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskLabelsAPI(id: string, data: ITaskLabelsCreate, tenantId?: string) {
	return put<ITaskLabelsCreate>(`/tags/${id}`, data, {
		tenantId
	});
}

export function deleteTaskLabelsAPI(id: string) {
	return deleteApi<DeleteResponse>(`/tags/${id}`);
}

export async function getTaskLabelsList(tenantId: string, organizationId: string, organizationTeamId: string | null) {
	const endpoint = `/tags/level?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

	return get<PaginationResponse<ITaskLabelsItemList>>(endpoint, { tenantId });
}
