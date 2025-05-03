import {
	DeleteResponse,
	ITaskRelatedIssueTypeCreate,
	ITaskRelatedIssueTypeItemList,
	PaginationResponse
} from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class TaskRelatedIssueTypeService extends APIService {
	createTaskRelatedIssueType = async (data: ITaskRelatedIssueTypeCreate, tenantId?: string) => {
		return this.post<ITaskRelatedIssueTypeCreate>('/task-related-issue-types', data, {
			tenantId
		});
	};

	editTaskRelatedIssueType = async (id: string, data: ITaskRelatedIssueTypeCreate, tenantId?: string) => {
		return this.put<ITaskRelatedIssueTypeCreate>(`/task-related-issue-types/${id}`, data, {
			tenantId
		});
	};

	deleteTaskRelatedIssueType = async (id: string) => {
		return this.delete<DeleteResponse>(`/task-related-issue-types/${id}`);
	};

	getTaskRelatedIssueTypeList = async (
		tenantId: string,
		organizationId: string,
		organizationTeamId: string | null
	) => {
		const endpoint = `/task-related-issue-types?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

		return this.get<PaginationResponse<ITaskRelatedIssueTypeItemList>>(endpoint, { tenantId });
	};
}

export const taskRelatedIssueTypeService = new TaskRelatedIssueTypeService(GAUZY_API_BASE_SERVER_URL.value);
