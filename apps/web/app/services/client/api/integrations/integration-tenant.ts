import { IIntegrationTenant, PaginationResponse, DeleteResponse } from '@/core/types/interfaces';
import { deleteApi, get } from '../../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';
import qs from 'qs';

export function getIntegrationTenantAPI(name: string) {
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

	return get<PaginationResponse<IIntegrationTenant>>(endpoint);
}

export function deleteIntegrationTenantAPI(integrationId: string) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/integration-tenant/${integrationId}?organizationId=${organizationId}&tenantId=${tenantId}`
		: `/integration-tenant/${integrationId}`;

	return deleteApi<DeleteResponse>(endpoint);
}
