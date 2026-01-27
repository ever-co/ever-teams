import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	integrationTenantListSchema,
	TIntegrationTenantList
} from '@/core/types/schemas';

class IntegrationTenantService extends APIService {
	getIntegrationTenant = async ({ name }: { name: string }): Promise<PaginationResponse<TIntegrationTenantList>> => {
		const query = qs.stringify({
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			'where[name]': name
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration-tenant?${query}`
			: `/integration-tenant/remember/state?name=${name}`;

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TIntegrationTenantList>>(endpoint),
			(data) => validatePaginationResponse(integrationTenantListSchema, data, 'getIntegrationTenant API response'),
			{ method: 'getIntegrationTenant', service: 'IntegrationTenantService', name }
		);
	};

	deleteIntegrationTenant = async (integrationId: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration-tenant/${integrationId}?organizationId=${this.organizationId}&tenantId=${this.tenantId}`
			: `/integration-tenant/${integrationId}`;

		return this.delete<DeleteResponse>(endpoint);
	};
}

export const integrationTenantService = new IntegrationTenantService(GAUZY_API_BASE_SERVER_URL.value);
