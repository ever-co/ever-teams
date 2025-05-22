import {
	DeleteResponse,
	ITaskSizesCreate,
	ITaskSizeNameEnum,
	PaginationResponse
} from '@/core/types/interfaces/to-review';
import { APIService } from '../../api.service';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class TaskSizeService extends APIService {
	createTaskSize = async (data: ITaskSizesCreate) => {
		const tenantId = getTenantIdCookie();

		return this.post<ITaskSizeNameEnum>('/task-sizes', data, {
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
		return this.get<PaginationResponse<ITaskSizeNameEnum>>(endpoint);
	};
}

export const taskSizeService = new TaskSizeService(GAUZY_API_BASE_SERVER_URL.value);
