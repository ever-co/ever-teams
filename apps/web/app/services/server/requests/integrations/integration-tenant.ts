import { IIntegrationTenant } from '@app/interfaces';
import { serverFetch } from '../../fetch';

/**
 * Get integration tenant request
 *
 * @param param0
 * @param bearer_token
 * @returns
 */
export function getIntegrationTenantRequest(
	{ tenantId, organizationId, name }: { tenantId: string; organizationId: string; name: string },
	bearer_token: string
) {
	const query = new URLSearchParams({
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		'where[name]': name
	});
	return serverFetch<IIntegrationTenant>({
		path: `/integration-tenant?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}

export function deleteIntegrationTenantRequest(
	integrationId: string,
	tenantId: string,
	organizationId: string,
	bearer_token: string
) {
	return serverFetch<IIntegrationTenant>({
		path: `/integration-tenant/${integrationId}?organizationId=${organizationId}&tenantId=${tenantId}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
