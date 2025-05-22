import { IIntegration } from '@/core/types/interfaces/to-review';
import { serverFetch } from '../../fetch';
import qs from 'qs';

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
	const query = qs.stringify({
		filters: JSON.stringify({
			searchQuery,
			integrationTypeId
		})
	});

	return serverFetch<IIntegration>({
		path: `/integration?${query}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}
