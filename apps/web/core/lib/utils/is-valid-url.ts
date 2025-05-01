export function isValidUrl(urlString: string) {
	try {
		return Boolean(new URL(urlString));
	} catch (e) {
		return false;
	}
}
