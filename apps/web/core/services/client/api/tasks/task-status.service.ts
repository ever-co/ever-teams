import {
	DeleteResponse,
	ITaskStatusCreate,
	ITaskStatusItemList,
	ITaskStatusOrder,
	PaginationResponse
} from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class TaskStatusService extends APIService {
	createTaskStatus = async (data: ITaskStatusCreate, tenantId?: string) => {
		return this.post<ITaskStatusCreate>('/task-statuses', data, {
			tenantId
		});
	};

	editTaskStatus = async (id: string, data: ITaskStatusCreate, tenantId?: string) => {
		return this.put<ITaskStatusCreate>(`/task-statuses/${id}`, data, {
			tenantId
		});
	};

	editTaskStatusOrder = async (data: ITaskStatusOrder, tenantId?: string) => {
		return this.patch<ITaskStatusOrder['reorder']>(`/task-statuses/reorder`, data, {
			tenantId,
			method: 'PATCH'
		});
	};
	deleteTaskStatus = async (id: string) => {
		return this.delete<DeleteResponse>(`/task-statuses/${id}`);
	};

	getTaskStatuses = async (tenantId: string, organizationId: string, organizationTeamId: string | null) => {
		const query = qs.stringify({
			tenantId,
			organizationId,
			organizationTeamId
		});

		const endpoint = `/task-statuses?${query}`;

		return this.get<PaginationResponse<ITaskStatusItemList>>(endpoint, { tenantId });
	};
}

export const taskStatusService = new TaskStatusService(GAUZY_API_BASE_SERVER_URL.value);
