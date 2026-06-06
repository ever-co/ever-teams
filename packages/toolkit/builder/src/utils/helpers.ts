export const getUrlPath = (pageParams: string[]): string => {
	const segments = (pageParams ?? []).filter(Boolean).join('/');
	return segments ? `/builder/${segments}` : '/builder';
};

export const maskApiKey = (key: string): string => {
	if (!key) return '';
	if (key.length <= 5) return '*'.repeat(key.length);
	return `****${key.slice(-5)}`;
};

export function normalizePageUrl(url: string): string {
	if (!url) return '';
	let normalized = url.trim().toLowerCase();

	if (!normalized.startsWith('/')) {
		normalized = '/' + normalized;
	}
	if (normalized.length > 1 && normalized.endsWith('/')) {
		normalized = normalized.slice(0, -1);
	}
	return normalized;
}

function isValidBuilderUrl(url: string): boolean {
	const normalizedUrl = normalizePageUrl(url);

	if (!normalizedUrl.startsWith('/builder/') && normalizedUrl !== '/builder') {
		return false;
	}

	if (normalizedUrl === '/builder') {
		return true;
	}

	const path = normalizedUrl.slice('/builder/'.length);
	if (path.length === 0) {
		return true;
	}

	const invalidChars = /[<>{}|\\^~\[\]`]/;
	if (invalidChars.test(path)) {
		return false;
	}

	const validPathRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9\-_\.\/]*[a-zA-Z0-9])?$/;
	if (!validPathRegex.test(path)) {
		return false;
	}

	if (path.includes('//') || path.includes('..')) {
		return false;
	}

	if (path.length > 255) {
		return false;
	}

	return true;
}

export function getValidBuilderUrl(url: string | undefined, fallback: string): string {
	const normalizedUrl = url ? normalizePageUrl(url) : undefined;
	if (normalizedUrl && isValidBuilderUrl(normalizedUrl)) {
		return normalizedUrl;
	}
	const normalizedFallback = normalizePageUrl(fallback);
	return isValidBuilderUrl(normalizedFallback) ? normalizedFallback : '/builder';
}
