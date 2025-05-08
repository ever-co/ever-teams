import {
	DeleteResponse,
	ITaskPrioritiesCreate,
	ITaskPrioritiesItemList,
	PaginationResponse
} from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class TaskPriorityService extends APIService {
	createTaskPriority = async (data: ITaskPrioritiesCreate, tenantId?: string) => {
		return this.post<ITaskPrioritiesCreate>('/task-priorities', data, {
			tenantId
		});
	};

	editTaskPriority = async (id: string, data: ITaskPrioritiesCreate, tenantId?: string) => {
		return this.put<ITaskPrioritiesCreate>(`/task-priorities/${id}`, data, {
			tenantId
		});
	};

	deleteTaskPriority = async (id: string) => {
		return this.delete<DeleteResponse>(`/task-priorities/${id}`);
	};

	getTaskPrioritiesList = async (tenantId: string, organizationId: string, organizationTeamId: string | null) => {
		const endpoint = `/task-priorities?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

		return this.get<PaginationResponse<ITaskPrioritiesItemList>>(endpoint, { tenantId });
	};
}

export const taskPriorityService = new TaskPriorityService(GAUZY_API_BASE_SERVER_URL.value);
