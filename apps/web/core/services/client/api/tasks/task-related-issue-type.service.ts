import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ITaskRelatedIssueType, ITaskRelatedIssueTypeCreate } from '@/core/types/interfaces/task/related-issue-type';

class TaskRelatedIssueTypeService extends APIService {
	createTaskRelatedIssueType = async (data: ITaskRelatedIssueTypeCreate, tenantId?: string) => {
		// Not implemented in the API
		// return this.post<ITaskRelatedIssueTypeCreate>('/task-related-issue-types', data, {
		// 	tenantId
		// });
	};

	editTaskRelatedIssueType = async (id: string, data: ITaskRelatedIssueTypeCreate, tenantId?: string) => {
		// Not implemented in the API
		// return this.put<ITaskRelatedIssueTypeCreate>(`/task-related-issue-types/${id}`, data, {
		// 	tenantId
		// });
	};

	deleteTaskRelatedIssueType = async (id: string) => {
		// Not implemented in the API
		// return this.delete<DeleteResponse>(`/task-related-issue-types/${id}`);
	};

	getTaskRelatedIssueTypeList = async () => {
		const endpoint = `/task-related-issue-types?tenantId=${this.tenantId}&organizationId=${this.organizationId}&organizationTeamId=${this.activeTeamId}`;

		return this.get<PaginationResponse<ITaskRelatedIssueType>>(endpoint, { tenantId: this.tenantId });
	};
}

export const taskRelatedIssueTypeService = new TaskRelatedIssueTypeService(GAUZY_API_BASE_SERVER_URL.value);
