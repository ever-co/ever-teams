import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/** Stands for the API's address when the browser reaches the API through the app's own server and does not know it. */
export const API_URL_PLACEHOLDER = 'API_URL';

/** The API's public address for code a person copies out of the app, else the placeholder they replace. */
export function publicApiOriginOrPlaceholder(): string {
	return GAUZY_API_BASE_SERVER_URL.value || API_URL_PLACEHOLDER;
}

/** The address without the slashes it ends with: a loop, which a long run of slashes cannot slow down as a regex can. */
export function withoutTrailingSlashes(address: string): string {
	let end = address.length;
	while (end > 0 && address[end - 1] === '/') {
		end -= 1;
	}
	return address.slice(0, end);
}
