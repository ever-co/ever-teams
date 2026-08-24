import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ITag, ITagCreate } from '@/core/types/interfaces/tag/tag';
import { TTag } from '@/core/types/schemas';
import { TaskMetadataScope } from '@/core/types/interfaces/task/task-metadata-bootstrap';
import qs from 'qs';

class TaskLabelService extends APIService {
	createTaskLabels = async (data: ITagCreate) => {
		return this.post<ITag>('/tags', data, {
			headers: {
				'Tenant-Id': this.tenantId
			}
		});
	};

	editTaskLabels = async ({ tagId, data }: { tagId: string; data: ITagCreate }) => {
		return this.put<ITag>(`/tags/${tagId}`, data, {
			tenantId: this.tenantId
		});
	};

	deleteTaskLabels = async (id: string) => {
		return this.delete<DeleteResponse>(`/tags/${id}`);
	};

	getTaskLabelsList = async (scope?: TaskMetadataScope) => {
		if (scope) {
			const query = qs.stringify({
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				...(scope.organizationTeamId !== undefined ? { organizationTeamId: scope.organizationTeamId } : {})
			});
			const endpoint = `/tags/level?${query}`;

			return this.get<PaginationResponse<TTag>>(endpoint, { tenantId: scope.tenantId });
		}

		const endpoint = `/tags/level?tenantId=${this.tenantId}&organizationId=${this.organizationId}&organizationTeamId=${this.activeTeamId}`;

		return this.get<PaginationResponse<TTag>>(endpoint, { tenantId: this.tenantId });
	};
}

export const taskLabelService = new TaskLabelService(GAUZY_API_BASE_SERVER_URL.value);
