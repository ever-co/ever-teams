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
			// throw Promise.reject(data);
			return (await res.json()) as IServerError;
		}
		const data = (await res.json()) as T;
		return {
			data,
			response: res
		};
	});
}
