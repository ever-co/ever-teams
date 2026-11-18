import { apiConfigManager, IApiRequestConfig } from './api-config';

// Read when the request is sent, so a caller without an address of its own follows a later setConfig().
export function apiUrlOf(api?: IApiRequestConfig): string {
	const own = api?.apiUrl;
	if (own !== undefined) {
		return own;
	}
	return apiConfigManager.getConfig().apiUrl;
}
