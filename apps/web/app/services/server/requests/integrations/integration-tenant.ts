import { serverFetch } from '../../fetch';

// TODO Type/Interface
/**
 * Get integration tenant request
 *
 * @param param0
 * @param bearer_token
 * @returns
 */
export function getIntegrationTenantRequest(
	{ tenantId, organizationId, name }: any,
	bearer_token: string
) {
	const query = new URLSearchParams({
		tenantId,
		organizationId,
		name,
	});
	return serverFetch<any>({
		path: `/integration-tenant/remember/state?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId,
	});
}
