import { apiConfigManager } from '@ever-teams/api';
import type { IApiRequestConfig } from '@ever-teams/api';

// The address a provider's requests go to, as the API package picks it: the provider's own, else the page's.
export function apiUrlOf(api?: IApiRequestConfig): string {
	const own = api?.apiUrl;
	if (own !== undefined) {
		return own;
	}
	return apiConfigManager.getConfig().apiUrl;
}
