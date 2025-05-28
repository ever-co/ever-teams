import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/global/data-response';
import { ITag, ITagCreate } from '@/core/types/interfaces/tag/tag';

class TaskLabelService extends APIService {
	createTaskLabels = async (data: ITagCreate, tenantId?: string) => {
		return this.post<ITag>('/tags', data, {
			headers: {
				'Tenant-Id': tenantId
			}
		});
	};

	editTaskLabels = async (id: string, data: ITagCreate, tenantId?: string) => {
		return this.put<ITag>(`/tags/${id}`, data, {
			tenantId
		});
	};

	deleteTaskLabels = async (id: string) => {
		return this.delete<DeleteResponse>(`/tags/${id}`);
	};

	getTaskLabelsList = async (tenantId: string, organizationId: string, organizationTeamId: string | null) => {
		const endpoint = `/tags/level?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

		return this.get<PaginationResponse<ITag>>(endpoint, { tenantId });
	};
}

export const taskLabelService = new TaskLabelService(GAUZY_API_BASE_SERVER_URL.value);
