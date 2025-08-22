import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IIssueTypesCreate, IIssueType } from '@/core/types/interfaces/task/issue-type';

class IssueTypeService extends APIService {
	createIssueType = async (data: IIssueTypesCreate) => {
		return this.post<IIssueTypesCreate>('/issue-types', data, {
			tenantId: this.tenantId
		});
	};

	editIssueType = async ({ issueTypeId, data }: { issueTypeId: string; data: IIssueTypesCreate }) => {
		return this.put<IIssueTypesCreate>(`/issue-types/${issueTypeId}`, data, {
			tenantId: this.tenantId
		});
	};

	deleteIssueType = async (id: string) => {
		return this.delete<DeleteResponse>(`/issue-types/${id}`);
	};

	getIssueTypeList = async () => {
		const endpoint = `/issue-types?tenantId=${this.tenantId}&organizationId=${this.organizationId}&organizationTeamId=${this.activeTeamId}`;

		return this.get<PaginationResponse<IIssueType>>(endpoint, { tenantId: this.tenantId });
	};
}

export const issueTypeService = new IssueTypeService(GAUZY_API_BASE_SERVER_URL.value);
