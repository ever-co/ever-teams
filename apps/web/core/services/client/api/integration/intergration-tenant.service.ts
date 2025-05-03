import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, IIntegrationTenant, PaginationResponse } from '@/core/types/interfaces';

class IntegrationTenantService extends APIService {
	getIntegrationTenantAPI = async (name: string) => {
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

		return this.get<PaginationResponse<IIntegrationTenant>>(endpoint);
	};

	deleteIntegrationTenantAPI = async (integrationId: string) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration-tenant/${integrationId}?organizationId=${organizationId}&tenantId=${tenantId}`
			: `/integration-tenant/${integrationId}`;

		return this.delete<DeleteResponse>(endpoint);
	};
}

export const integrationTenantService = new IntegrationTenantService(GAUZY_API_BASE_SERVER_URL.value);
