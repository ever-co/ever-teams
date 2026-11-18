import { IApiCall, IServerError } from '@ever-teams/toolkit-types';
import { apiConfigManager } from './config/api-config';

export function ApiCall<T>({ path, method, body, init, bearer_token, tenantId, organizationId }: IApiCall) {
	const config = apiConfigManager.getConfig();
	const url = config.apiUrl;

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

	if (organizationId) {
		headers['organization-id'] = organizationId;
	}

	const datas: { body?: string } = {};
	if (body) {
		datas['body'] = JSON.stringify(body);
	}

	return fetch(url + path, {
		...datas,
		...(init || {}),
		headers: {
			...headers,
			...(init?.headers || {})
		},
		method,
		credentials: 'same-origin'
	}).then(async (res: Response) => {
		if (!res.ok) {
			// An error answer keeps its HTTP status, even when its body is empty or not JSON (a gateway's HTML page):
			// a caller can then tell an answer from a request that got none, which comes back with no status.
			const body: unknown = await res.json().catch(() => null);
			const text = res.statusText || `HTTP ${res.status}`;
			if (body && typeof body === 'object' && !Array.isArray(body)) {
				// A body with neither a message nor an error gets the status text, which the request functions look for.
				const hasText = 'message' in body || 'error' in body;
				const fallback = hasText ? {} : { message: text, error: text };
				return { statusCode: res.status, ...fallback, ...body } as IServerError;
			}
			return { statusCode: res.status, message: text, error: text } as IServerError;
		}
		const data = (await res.json()) as T;
		return {
			data,
			response: res
		};
	});
}
