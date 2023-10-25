import { IIntegration } from '@app/interfaces';
import { serverFetch } from '../../fetch';

/**
 * Get integration
 *
 * @param param0
 * @param bearer_token
 * @returns
 */
export function getIntegrationRequest(
	{
		searchQuery,
		integrationTypeId,
		tenantId
	}: {
		searchQuery: string;
		integrationTypeId: string;
		tenantId: string;
	},
	bearer_token: string
) {
	const query = new URLSearchParams({
		filters: JSON.stringify({
			searchQuery,
			integrationTypeId
		})
	});
	return serverFetch<IIntegration>({
		path: `/integration?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}
