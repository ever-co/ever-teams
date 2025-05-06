import { DeleteResponse, ITaskVersionCreate, ITaskVersionItemList, PaginationResponse } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class TaskVersionService extends APIService {
	createTaskVersion = async (data: ITaskVersionCreate, tenantId?: string) => {
		return this.post<ITaskVersionCreate>('/task-versions', data, {
			tenantId
		});
	};

	editTaskVersion = async (id: string, data: ITaskVersionCreate, tenantId?: string) => {
		return this.put<ITaskVersionCreate>(`/task-versions/${id}`, data, {
			tenantId
		});
	};

	deleteTaskVersion = async (id: string) => {
		return this.delete<DeleteResponse>(`/task-versions/${id}`);
	};

	getTaskVersionList = async (tenantId: string, organizationId: string, organizationTeamId: string | null) => {
		const endpoint = `/task-versions?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

		return this.get<PaginationResponse<ITaskVersionItemList>>(endpoint, { tenantId });
	};
}

export const taskVersionService = new TaskVersionService(GAUZY_API_BASE_SERVER_URL.value);
