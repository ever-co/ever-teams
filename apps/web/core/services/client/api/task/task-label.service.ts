import { DeleteResponse, ITaskLabelsCreate, ITaskLabelsItemList, PaginationResponse } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class TaskLabelService extends APIService {
	createTaskLabels = async (data: ITaskLabelsCreate, tenantId?: string) => {
		return this.post<ITaskLabelsCreate>('/tags', data, {
			headers: {
				'Tenant-Id': tenantId
			}
		});
	};

	editTaskLabels = async (id: string, data: ITaskLabelsCreate, tenantId?: string) => {
		return this.put<ITaskLabelsCreate>(`/tags/${id}`, data, {
			tenantId
		});
	};

	deleteTaskLabels = async (id: string) => {
		return this.delete<DeleteResponse>(`/tags/${id}`);
	};

	getTaskLabelsList = async (tenantId: string, organizationId: string, organizationTeamId: string | null) => {
		const endpoint = `/tags/level?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

		return this.get<PaginationResponse<ITaskLabelsItemList>>(endpoint, { tenantId });
	};
}

export const taskLabelService = new TaskLabelService(GAUZY_API_BASE_SERVER_URL.value);
