import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/global/data-response';
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

	getTaskRelatedIssueTypeList = async (
		tenantId: string,
		organizationId: string,
		organizationTeamId: string | null
	) => {
		const endpoint = `/task-related-issue-types?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

		return this.get<PaginationResponse<ITaskRelatedIssueType>>(endpoint, { tenantId });
	};
}

export const taskRelatedIssueTypeService = new TaskRelatedIssueTypeService(GAUZY_API_BASE_SERVER_URL.value);
