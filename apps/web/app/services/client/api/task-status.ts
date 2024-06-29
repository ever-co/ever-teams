import { DeleteResponse, ITaskStatusCreate, ITaskStatusItemList, PaginationResponse } from '@app/interfaces';
import { deleteApi, get, post, put } from '../axios';
import qs from 'qs';
import { UUID } from 'crypto';

export function createTaskStatusAPI(data: ITaskStatusCreate, tenantId?: string) {
	return post<ITaskStatusCreate>('/task-statuses', data, {
		tenantId
	});
}

export function editTaskStatusAPI(id: string, data: ITaskStatusCreate, tenantId?: string) {
	return put<ITaskStatusCreate>(`/task-statuses/${id}`, data, {
		tenantId
	});
}

type ITaskStatusOrder = {
	organizationId: UUID;
	reorder: { id: string; order: number }[];
};
export function editTaskStatusOrderAPI(data: ITaskStatusOrder, tenantId?: string) {
	return put<ITaskStatusCreate>(`/task-statuses/reorder`, data, {
		tenantId
	});
}
export function deleteTaskStatusAPI(id: string) {
	return deleteApi<DeleteResponse>(`/task-statuses/${id}`);
}

export async function getTaskStatusList(tenantId: string, organizationId: string, organizationTeamId: string | null) {
	const query = qs.stringify({
		tenantId,
		organizationId,
		organizationTeamId
	});

	const endpoint = `/task-statuses?${query}`;

	return get<PaginationResponse<ITaskStatusItemList>>(endpoint, { tenantId });
}
