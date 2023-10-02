import { serverFetch } from '../../fetch';

// TODO Type/Interface
/**
 * Get integration
 *
 * @param param0
 * @param bearer_token
 * @returns
 */
export function getIntegrationRequest(
	{ searchQuery, integrationTypeId, tenantId }: any,
	bearer_token: string
) {
	const query = new URLSearchParams({
		filters: JSON.stringify({
			searchQuery,
			integrationTypeId,
		}),
	});
	return serverFetch<any>({
		path: `/integration?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId,
	});
}
