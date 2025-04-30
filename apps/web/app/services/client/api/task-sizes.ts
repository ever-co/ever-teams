import { DeleteResponse, ITaskSizesCreate, ITaskSizesItemList, PaginationResponse } from '@/core/types/interfaces';
import { deleteApi, get, post, put } from '../axios';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';

export function createTaskSizeAPI(data: ITaskSizesCreate) {
	const tenantId = getTenantIdCookie();

	return post<ITaskSizesItemList>('/task-sizes', data, {
		tenantId
	});
}

export function editTaskSizeAPI(id: string, data: ITaskSizesCreate) {
	const tenantId = getTenantIdCookie();

	return put<ITaskSizesCreate>(`/task-sizes/${id}`, data, {
		tenantId
	});
}

export function deleteTaskSizeAPI(id: string) {
	return deleteApi<DeleteResponse>(`/task-sizes/${id}`);
}

export async function getTaskSizes() {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const activeTeamId = getActiveTeamIdCookie();

	const endpoint = `/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`;
	return get<PaginationResponse<ITaskSizesItemList>>(endpoint);
}
