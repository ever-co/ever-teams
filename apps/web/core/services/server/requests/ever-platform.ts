import { readPairedApiUrl } from '@/core/lib/ever-platform/stats-config';

/**
 * Forwards one request of the Ever Platform settings to the paired API, with the signed-in person's
 * own token and tenant, and answers its status and JSON body WITHOUT throwing (unlike serverFetch):
 * the settings rely on the API's 404 to tell an operator from everyone else, so every status must
 * reach the caller as it is.
 *
 * The target is always the configured API (GAUZY_API_SERVER_URL, or NEXT_PUBLIC_GAUZY_API_SERVER_URL):
 * never a host taken from the request, and never a hosted fallback. No redirect is followed and
 * nothing is cached.
 */

export interface PassThroughRequest {
	/** Path under the API's `/api`, starting with `/` (built from an allow-list, never from user input). */
	readonly path: string;
	readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
	readonly bearer: string;
	readonly tenantId?: string | null;
	readonly body?: unknown;
	readonly fetch?: typeof globalThis.fetch;
}

export interface PassThroughResponse {
	readonly status: number;
	readonly data: unknown;
}

export const PASS_THROUGH_TIMEOUT_MS = 15_000;

export async function gauzyPassThrough(request: PassThroughRequest): Promise<PassThroughResponse> {
	const apiUrl = readPairedApiUrl();
	// No configured API: answer as if the route did not exist, and ask nobody.
	if (!apiUrl) return { status: 404, data: null };
	const fetchImpl = request.fetch ?? globalThis.fetch;
	const headers: Record<string, string> = {
		accept: 'application/json',
		authorization: `Bearer ${request.bearer}`
	};
	if (request.tenantId) headers['tenant-id'] = request.tenantId;
	if (request.body !== undefined) headers['content-type'] = 'application/json';

	let response: Response;
	try {
		response = await fetchImpl(`${apiUrl}${request.path}`, {
			method: request.method,
			headers,
			body: request.body === undefined ? undefined : JSON.stringify(request.body),
			cache: 'no-store',
			redirect: 'manual',
			signal: AbortSignal.timeout(PASS_THROUGH_TIMEOUT_MS)
		});
	} catch {
		return { status: 502, data: null };
	}
	// A redirect is never followed, and never handed to the browser either.
	if (response.status >= 300 && response.status < 400) return { status: 502, data: null };
	if (response.status === 204) return { status: 204, data: null };
	const data = await response.json().catch(() => null);
	return { status: response.status, data };
}
