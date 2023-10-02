import { serverFetch } from '../../fetch';

// TODO Type/Interface
/**
 * Get integration types request
 *
 * @param param0
 * @param bearer_token
 * @returns
 */
export function getIntegrationTypesRequest(
	{ tenantId }: any,
	bearer_token: string
) {
	return serverFetch<any>({
		path: `/integration/types`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId,
	});
}
