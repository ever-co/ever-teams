import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	integrationTenantListSchema,
	ZodValidationError,
	TIntegrationTenantList
} from '@/core/types/schemas';

class IntegrationTenantService extends APIService {
	getIntegrationTenant = async (name: string): Promise<PaginationResponse<TIntegrationTenantList>> => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const query = qs.stringify({
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			'where[name]': name
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration-tenant?${query}`
			: `/integration-tenant/remember/state?name=${name}`;

		try {
			const response = await this.get<PaginationResponse<TIntegrationTenantList>>(endpoint);

			// Validate the response data using Zod schema
			return validatePaginationResponse(
				integrationTenantListSchema,
				response.data,
				'getIntegrationTenant API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Integration tenant validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	deleteIntegrationTenant = async (integrationId: string) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration-tenant/${integrationId}?organizationId=${organizationId}&tenantId=${tenantId}`
			: `/integration-tenant/${integrationId}`;

		return this.delete<DeleteResponse>(endpoint);
	};
}

export const integrationTenantService = new IntegrationTenantService(GAUZY_API_BASE_SERVER_URL.value);
