const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_PATH = /(?:^|\/)(?:_next\/|assets?\/)|\.(?:css|gif|ico|jpe?g|js|map|png|svg|webp|woff2?)(?:$|\/)/i;

function canonicalQuery(searchParams) {
	const grouped = new Map();
	for (const [rawKey, value] of searchParams.entries()) {
		const key = rawKey.replace(/\[\d+\]/g, '[]');
		const values = grouped.get(key) ?? [];
		values.push(value);
		grouped.set(key, values);
	}

	return [...grouped.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.flatMap(([key, values]) =>
			values.sort().map((value) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
		)
		.join('&');
}

function normalizePath(pathname) {
	const normalized = pathname
		.split('/')
		.map((segment) => {
			let decoded = segment;
			try {
				decoded = decodeURIComponent(segment);
			} catch {
				// Preserve malformed path bytes as-is so one request cannot abort the capture.
			}
			return UUID_SEGMENT.test(decoded) ? ':uuid' : segment;
		})
		.join('/');
	return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function isConfiguredOrigin(url, apiOrigins) {
	if (!apiOrigins?.length) {
		return /(?:^|\.)ever\.team$/i.test(url.hostname) || /(?:^|\.)gauzy\.co$/i.test(url.hostname);
	}
	return apiOrigins.some((origin) => {
		try {
			return new URL(origin).origin === url.origin;
		} catch {
			return false;
		}
	});
}

export function isRichGlobalRead(method, path) {
	if (method.toUpperCase() !== 'GET') return false;
	return (
		(/^\/api\/timesheet\/time-log(?:$|\/report(?:\/|$))/.test(path) &&
			!/^\/api\/timesheet\/time-log\/time-limit(?:\/|$)/.test(path)) ||
		/^\/api\/timesheet\/activity\/report(?:\/|$)/.test(path)
	);
}

/**
 * Produces a stable comparison key without ever inspecting headers or bodies.
 * UUIDs are normalized only in path segments; query UUIDs intentionally remain
 * distinct so employee/team A and B cannot collapse into a false duplicate.
 */
export function normalizeGauzyRequest(request, { apiOrigins = [] } = {}) {
	const method = String(request?.method ?? 'GET').toUpperCase();
	const resourceType = String(request?.resourceType ?? '').toLowerCase();
	if (!['fetch', 'xhr'].includes(resourceType) || method === 'OPTIONS') return null;

	let url;
	try {
		url = new URL(request.url);
	} catch {
		return null;
	}
	if (!isConfiguredOrigin(url, apiOrigins)) return null;
	if (url.searchParams.has('_rsc')) return null;

	const path = normalizePath(url.pathname);
	if (
		ASSET_PATH.test(path) ||
		/^\/api\/(?:auth\/session|health)(?:\/|$)/.test(path) ||
		/^\/(?:auth\/session|health)(?:\/|$)/.test(path)
	) {
		return null;
	}

	const query = canonicalQuery(url.searchParams);
	const routeKey = `${method} ${path}`;
	return {
		method,
		path,
		query,
		key: query ? `${routeKey}?${query}` : routeKey,
		routeKey,
		richGlobalRead: isRichGlobalRead(method, path)
	};
}
