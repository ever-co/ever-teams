import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/global/IDataResponse';
import { IIssueTypesCreate, IIssueType } from '@/core/types/interfaces/task/IIssueType';

class IssueTypeService extends APIService {
	createIssueType = async (data: IIssueTypesCreate, tenantId?: string) => {
		return this.post<IIssueTypesCreate>('/issue-types', data, {
			tenantId
		});
	};

	editIssueType = async (id: string, data: IIssueTypesCreate, tenantId?: string) => {
		return this.put<IIssueTypesCreate>(`/issue-types/${id}`, data, {
			tenantId
		});
	};

	deleteIssueType = async (id: string) => {
		return this.delete<DeleteResponse>(`/issue-types/${id}`);
	};

	getIssueTypeList = async (tenantId: string, organizationId: string, activeTeamId: string | null) => {
		const endpoint = `/issue-types?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`;

		return this.get<PaginationResponse<IIssueType>>(endpoint, { tenantId });
	};
}

export const issueTypeService = new IssueTypeService(GAUZY_API_BASE_SERVER_URL.value);
