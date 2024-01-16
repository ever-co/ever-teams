import { DeleteResponse, ITaskPrioritiesCreate, ITaskPrioritiesItemList, PaginationResponse } from '@app/interfaces';
import api, { get, post, put } from '../axios';

export function createTaskPrioritiesAPI(data: ITaskPrioritiesCreate, tenantId?: string) {
	return post<ITaskPrioritiesCreate>('/task-priorities', data, {
		tenantId
	});
}

export function editTaskPrioritiesAPI(id: string, data: ITaskPrioritiesCreate, tenantId?: string) {
	return put<ITaskPrioritiesCreate>(`/task-priorities/${id}`, data, {
		tenantId
	});
}

export function deleteTaskPrioritiesAPI(id: string) {
	return api.delete<DeleteResponse>(`/task-priorities/${id}`);
}

export async function getTaskPrioritiesList(
	tenantId: string,
	organizationId: string,
	organizationTeamId: string | null
) {
	const endpoint = `/task-priorities?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

	return get<PaginationResponse<ITaskPrioritiesItemList>>(endpoint, { tenantId });
}
