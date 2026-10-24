import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { clientIpHeaders } from './client-ip';

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

	// The browser's address for Gauzy's per-IP limits, when EVER_TEAMS_CLIENT_IP_SECRET is set (client-ip.ts)
	return clientIpHeaders()
		.then((ipHeaders) =>
			fetch(GAUZY_API_SERVER_URL + path, {
				...datas,
				...(init || {}),
				headers: {
					...headers,
					...ipHeaders,
					...(init?.headers || {})
				},
				method
			})
		)
		.then(async (res) => {
			const data = (await res.json().catch(console.error)) as T;

			if (!res.ok) {
				// Callers read Gauzy's error body with unwrapRejection(), so the rejection value stays a rejected
				// promise. It is marked handled: left as it was, every non-2xx answer (e.g. the 400 of
				// /invite/validate-by-code on each sign-in) was also reported as an unhandled rejection.
				const rejection = Promise.reject(data);
				rejection.catch(() => undefined);
				throw rejection;
			}

			return {
				data,
				response: res
			};
		});
}

// serverFetch rejects a non-2xx answer with Promise.reject(data), so Gauzy's error body sits inside
// that promise; a network failure rejects with a plain error that carries no status code.
export async function unwrapRejection(error: unknown): Promise<unknown> {
	if (!(error instanceof Promise)) return error;
	try {
		return await error;
	} catch (error_) {
		return error_;
	}
}

// Browser-safe, so it lives in its own module (list-card.tsx loads it in the browser): re-exported for server callers
export { svgFetch } from '@/core/lib/helpers/svg-fetch';
