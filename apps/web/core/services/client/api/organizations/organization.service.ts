import { IOrganization, IOrganizationCreate } from '@/core/types/interfaces/organization/organization';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { organizationSchema, validateApiResponse, ZodValidationError, type TOrganization } from '@/core/types/schemas';
import { scopedReadConfig, ScopedReadOptions } from '../../api-request-scope';
import { withNewOrganizationTrackingRequirements } from '@/core/constants/config/organization-creation';

/** What a save changes. A format saved as null leaves every reader with their own language's way again. */
export type TOrganizationChanges = Partial<Omit<IOrganization, 'dateFormat' | 'numberFormat'>> & {
	dateFormat?: string | null;
	numberFormat?: string | null;
};

class OrganizationService extends APIService {
	createOrganization = async (data: IOrganizationCreate, bearer_token: string) => {
		const body = withNewOrganizationTrackingRequirements(data);
		return this.post<IOrganization>('/organization', body, {
			headers: { Authorization: `Bearer ${bearer_token}` }
		}).then(({ data }) => data);
	};

	// Gauzy validates an update as a whole organization, so its name and currency go along with any change. They are
	// read again right before the save: the page's copy may be an hour old, and sending it back would silently undo
	// another admin's rename or currency change. Without that read, the page's copy is sent as before.
	updateOrganization = async (
		organization: Pick<TOrganization, 'id' | 'name' | 'currency'>,
		changes: TOrganizationChanges
	) => {
		const current = await this.getOrganizationById(organization.id).catch(() => null);
		const name = current?.name ?? organization.name;
		const currency = current?.currency ?? organization.currency;
		const body = { name, currency, ...changes };
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
