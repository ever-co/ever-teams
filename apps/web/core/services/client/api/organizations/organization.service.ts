import { IOrganization, IOrganizationCreate } from '@/core/types/interfaces/organization/organization';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class OrganizationService extends APIService {
	createOrganization = async (data: IOrganizationCreate, bearer_token: string) => {
		return this.post<IOrganization>('/organization', data, {
			headers: { Authorization: `Bearer ${bearer_token}` }
		}).then(({ data }) => data);
	};

	getOrganizationById = async (id: string) => {
		const response = await this.get<IOrganization>(`/organization/${id}`, {
			tenantId: this.tenantId
		});
		return response.data;
	};
}

export const organizationService = new OrganizationService(GAUZY_API_BASE_SERVER_URL.value);
