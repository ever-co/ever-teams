import { GAUZY_API_SERVER_URL, tasksStatusSvgCacheDuration } from '@app/constants';

export function serverFetch<T>({
	path,
	method,
	body,
	init,
	bearer_token,
	tenantId
}: {
	path: string;
	method: 'POST' | 'GET' | 'PUT' | 'DELETE';
	body?: any;
	bearer_token?: string;
	init?: RequestInit;
	tenantId?: string;
}) {
	const headers: HeadersInit = {
		'Content-Type': 'application/json',
		Accept: 'application/json'
	};

	if (bearer_token) {
		headers['authorization'] = `Bearer ${bearer_token}`;
	}

	if (tenantId) {
		headers['tenant-id'] = tenantId;
	}

	const datas: { body?: string } = {};
	if (body) {
		datas['body'] = JSON.stringify(body);
	}

	return fetch(GAUZY_API_SERVER_URL + path, {
		...datas,
		...(init || {}),
		headers: {
			...headers,
			...(init?.headers || {})
		},
		method
	}).then(async (res) => {
		const data = (await res.json().catch(console.error)) as T;

		if (!res.ok) {
			throw Promise.reject(data);
		}

		return {
			data,
			response: res
		};
	});
}

/** Tasks status SVG icons fetch */

// In memory cache for performance

const tasksStatusSvgCache = new Map<
	string,
	{
		content: Response;
		timestamp: number;
	}
>();

export async function svgFetch(url: string): Promise<Response> {
	try {
		//Url validation
		new URL(url);

		const cached = tasksStatusSvgCache.get(url);
		const now = Date.now();

		if (cached && now - cached.timestamp < tasksStatusSvgCacheDuration) {
			return cached.content.clone();
		}

		// Fetch the SVG
		const response = await fetch(url);

		tasksStatusSvgCache.set(url, {
			content: response.clone(),
			timestamp: now
		});
		return response;
	} catch {
		throw new Error('Invalid URL provided');
	}
}
