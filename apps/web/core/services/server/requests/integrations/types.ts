import { IIntegrationType } from '@/core/types/interfaces/integrations/integration-type';
import { serverFetch } from '../../fetch';

/**
 * Get integration types request
 *
 * @param param0
 * @param bearer_token
 * @returns
 */
export function getIntegrationTypesRequest(
	{
		tenantId
	}: {
		tenantId: string;
	},
	bearer_token: string
) {
	return serverFetch<IIntegrationType>({
		path: `/integration/types`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}
