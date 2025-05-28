import { APIService } from '../../api.service';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITaskSize, ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';

class TaskSizeService extends APIService {
	createTaskSize = async (data: ITaskSizesCreate) => {
		const tenantId = getTenantIdCookie();

		return this.post<ITaskSize>('/task-sizes', data, {
			tenantId
		});
	};

	editTaskSize = async (id: string, data: ITaskSizesCreate) => {
		const tenantId = getTenantIdCookie();

		return this.put<ITaskSizesCreate>(`/task-sizes/${id}`, data, {
			tenantId
		});
	};

	deleteTaskSize = async (id: string) => {
		return this.delete<DeleteResponse>(`/task-sizes/${id}`);
	};

	getTaskSizes = async () => {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();
		const activeTeamId = getActiveTeamIdCookie();

		const endpoint = `/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`;
		return this.get<PaginationResponse<ITaskSize>>(endpoint);
	};
}

export const taskSizeService = new TaskSizeService(GAUZY_API_BASE_SERVER_URL.value);
