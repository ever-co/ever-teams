import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/to-review';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITag, ITagCreate } from '@/core/types/interfaces/tag/ITag';

class TaskLabelService extends APIService {
	createTaskLabels = async (data: ITagCreate, tenantId?: string) => {
		return this.post<ITagCreate>('/tags', data, {
			headers: {
				'Tenant-Id': tenantId
			}
		});
	};

	editTaskLabels = async (id: string, data: ITagCreate, tenantId?: string) => {
		return this.put<ITagCreate>(`/tags/${id}`, data, {
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
