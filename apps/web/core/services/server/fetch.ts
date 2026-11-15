import { APP_NAME, GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { clientIpHeaders } from './client-ip';

/**
 * The header in which this app names itself to Gauzy (ever-co/ever-gauzy#11983). Gauzy records the name with a session
 * it signs in or renews, and the sessions list of Settings > Profile tells this app's sessions from those of the other
 * apps on the same API. Only this server sends it: a browser call would need Gauzy to allow the header first (CORS),
 * and Gauzy records a browser's origin by itself.
 */
const CLIENT_APP_HEADER = 'X-Client-App';

/**
 * The header naming `appName`, or none for a name a header cannot carry as is (fetch refuses characters beyond
 * Latin-1, which would fail every call) or that Gauzy would not record (more than 64 characters).
 */
export function clientAppHeaders(appName: string = APP_NAME): Record<string, string> {
	const name = appName.trim();
	return /^[\x20-\x7E]{1,64}$/.test(name) ? { [CLIENT_APP_HEADER]: name } : {};
}

/**
 * The browser's user agent for a call that signs a session in or renews it (ever-co/ever-gauzy#11983). Gauzy records
 * the user agent of the request that mints a session's tokens and names the session's device with it; this server's
 * own ("node") is an unknown device. `true` reads it from the request being handled; the proxy, where `next/headers`
 * does not answer, gives it. None outside a request, or for a value a header cannot carry as is.
 */
export async function browserUserAgentHeaders(userAgent: true | string): Promise<Record<string, string>> {
	let agent: string | null = userAgent === true ? null : userAgent;
	if (userAgent === true) {
		try {
			const { headers } = await import('next/headers');
			agent = (await headers()).get('user-agent');
		} catch (error) {
			// Next marks a page dynamic by throwing from headers(): that one must reach Next
			if ((error as { digest?: string } | null)?.digest === 'DYNAMIC_SERVER_USAGE') throw error;
			return {};
		}
	}
	const value = agent?.trim();
	return value && /^[\x20-\x7E]{1,512}$/.test(value) ? { 'User-Agent': value } : {};
}

/** Gauzy's error body, or, when it carries no status (empty, not JSON), one that gives the answer's HTTP status. */
function errorBodyWithStatus(data: unknown, res: Response): unknown {
	const fields = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
	if (typeof fields.statusCode === 'number') {
		return data;
	}
	return { ...fields, statusCode: res.status, message: fields.message ?? res.statusText };
}

export function serverFetch<T>({
	path,
	method,
	body,
	init,
	bearer_token,
	tenantId,
	keepsStatusOnError = false,
	browserUserAgent
}: {
	path: string;
	method: 'POST' | 'GET' | 'PUT' | 'DELETE';
	body?: any;
	bearer_token?: string;
	init?: RequestInit;
	tenantId?: string;
	/**
	 * Rejects an error answer without a status in its body (an empty 404, a proxy's 405) with one that gives the HTTP
	 * status, for a caller that must tell those apart. Off by default: other callers read such a rejection as Gauzy
	 * giving no answer (a 502 in gauzyErrorResponse, no session decision in the guard).
	 */
	keepsStatusOnError?: boolean;
	/**
	 * For a call that signs a session in or renews it: the browser's user agent goes along, so that Gauzy names the
	 * session's device (browserUserAgentHeaders). `true` takes it from the request being handled.
	 */
	browserUserAgent?: true | string;
}) {
	// A multipart body goes as is: fetch writes its Content-Type with the boundary it chose.
	const isMultipart = body instanceof FormData;
	const headers: HeadersInit = {
		Accept: 'application/json',
		...clientAppHeaders()
	};

	if (!isMultipart) {
		headers['Content-Type'] = 'application/json';
	}

	if (bearer_token) {
		headers['authorization'] = `Bearer ${bearer_token}`;
	}

	if (tenantId) {
		headers['tenant-id'] = tenantId;
	}

	const datas: { body?: BodyInit } = {};
	if (isMultipart) {
		datas['body'] = body;
	} else if (body) {
		datas['body'] = JSON.stringify(body);
	}

	// The browser's address for Gauzy's per-IP limits, when EVER_TEAMS_CLIENT_IP_SECRET is set (client-ip.ts), and its
	// user agent for a call that signs a session in or renews it
	return Promise.all([clientIpHeaders(), browserUserAgent ? browserUserAgentHeaders(browserUserAgent) : {}])
		.then(([ipHeaders, agentHeaders]) =>
			fetch(GAUZY_API_SERVER_URL + path, {
				...datas,
				...(init || {}),
				headers: {
					...headers,
					...agentHeaders,
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
				const rejection = Promise.reject(keepsStatusOnError ? errorBodyWithStatus(data, res) : data);
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

/** Gauzy's HTTP status in an unwrapped serverFetch rejection, or undefined when the API gave no error answer. */
export function apiErrorStatusOf(error: unknown): number | undefined {
	const statusCode = (error as { statusCode?: unknown } | null | undefined)?.statusCode;
	// NextResponse refuses a status outside 200-599 (RangeError): such a body is no usable HTTP error status
	const isErrorStatus = typeof statusCode === 'number' && statusCode >= 400 && statusCode <= 599;
	if (!isErrorStatus) {
		return undefined;
	}
	return statusCode;
}
