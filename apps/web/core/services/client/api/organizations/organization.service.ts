import { IOrganization, IOrganizationCreate } from '@/core/types/interfaces/organization/organization';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { organizationSchema, validateApiResponse, ZodValidationError, type TOrganization } from '@/core/types/schemas';
import { scopedReadConfig, ScopedReadOptions } from '../../api-request-scope';

class OrganizationService extends APIService {
	createOrganization = async (data: IOrganizationCreate, bearer_token: string) => {
		return this.post<IOrganization>('/organization', data, {
			headers: { Authorization: `Bearer ${bearer_token}` }
		}).then(({ data }) => data);
	};

	// Gauzy validates an update as a whole organization, so its name and currency go along with any change
	updateOrganization = async (
		organization: Pick<TOrganization, 'id' | 'name' | 'currency'>,
		changes: Partial<IOrganization>
	) => {
		const body = { name: organization.name, currency: organization.currency, ...changes };
		const response = await this.put<IOrganization>(`/organization/${organization.id}`, body, {
			tenantId: this.tenantId
		});
		return response.data;
	};

	getOrganizationById = async (id: string, options?: ScopedReadOptions) => {
		try {
			const response = await this.get<IOrganization>(`/organization/${id}`, {
				...(options ? scopedReadConfig(options) : { tenantId: this.tenantId })
			});
			return validateApiResponse(organizationSchema, response.data, 'getOrganizationById API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Organization validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationService'
				);
			}
			throw error;
		}
	};
}

export const organizationService = new OrganizationService(GAUZY_API_BASE_SERVER_URL.value);
