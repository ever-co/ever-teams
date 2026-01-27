import { IOrganization, IOrganizationCreate } from '@/core/types/interfaces/organization/organization';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { organizationSchema, validateApiResponse } from '@/core/types/schemas';

class OrganizationService extends APIService {
	createOrganization = async (data: IOrganizationCreate, bearer_token: string) => {
		return this.post<IOrganization>('/organization', data, {
			headers: { Authorization: `Bearer ${bearer_token}` }
		}).then(({ data }) => data);
	};

	getOrganizationById = async (id: string) => {
		return this.executeWithValidation(
			() => this.get<IOrganization>(`/organization/${id}`, { tenantId: this.tenantId }),
			(data) => validateApiResponse(organizationSchema, data, 'getOrganizationById API response'),
			{ method: 'getOrganizationById', service: 'OrganizationService', id }
		);
	};
}

export const organizationService = new OrganizationService(GAUZY_API_BASE_SERVER_URL.value);
