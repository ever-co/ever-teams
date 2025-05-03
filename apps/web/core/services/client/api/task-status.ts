import {
	DeleteResponse,
	ITaskStatusCreate,
	ITaskStatusItemList,
	ITaskStatusOrder,
	PaginationResponse
} from '@/core/types/interfaces';
import { deleteApi, get, post, put, patch } from '../axios';
import qs from 'qs';

export function createTaskStatusAPI(data: ITaskStatusCreate, tenantId?: string) {
	return post<ITaskStatusCreate>('/task-statuses', data, {
		tenantId
	})
		.then((response) => {

			return response;
		})
		.catch((error) => {
			console.error('[WEB][createTaskStatusAPI] Error:', error);
			throw error;
		});
}

export function editTaskStatusAPI(id: string, data: ITaskStatusCreate, tenantId?: string) {
	return put<ITaskStatusCreate>(`/task-statuses/${id}`, data, {
		tenantId
	});
}

export function editTaskStatusOrderAPI(data: ITaskStatusOrder, tenantId?: string) {
	return patch<ITaskStatusOrder['reorder']>(`/task-statuses/reorder`, data, {
		tenantId,
		method: 'PATCH'
	});
}
export function deleteTaskStatusAPI(id: string) {
	return deleteApi<DeleteResponse>(`/task-statuses/${id}`);
}

export async function getTaskStatusesAPI(tenantId: string, organizationId: string, organizationTeamId: string | null) {
	const query = qs.stringify({
		tenantId,
		organizationId,
		organizationTeamId
	});

	const endpoint = `/task-statuses?${query}`;

	return get<PaginationResponse<ITaskStatusItemList>>(endpoint, { tenantId });
}
