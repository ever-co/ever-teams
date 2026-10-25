/**
 * Test-only helpers for the app/api routes that hand a request on to Gauzy with forwardToGauzy (never part of the
 * app): a request from a signed-in browser, a stand-in for Gauzy's answer, and what the route sent to Gauzy.
 */
import { GAUZY_API_SERVER_URL, TENANT_ID_COOKIE_NAME, TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';

/** The session a browser holds in its cookies in proxy mode. */
const SESSION = { token: 'session-token-1', tenantId: 'tenant-1' } as const;

const originalFetch = global.fetch;

/** A request from a signed-in browser, with a JSON body when one is given. */
export function signedInRequest(url: string, method = 'GET', body?: unknown): Request {
	const headers: Record<string, string> = {
		cookie: `${TOKEN_COOKIE_NAME}=${SESSION.token}; ${TENANT_ID_COOKIE_NAME}=${SESSION.tenantId}`
	};
	if (body === undefined) return new Request(url, { method, headers });

	headers['content-type'] = 'application/json';
	return new Request(url, { method, headers, body: JSON.stringify(body) });
}

/** The params a dynamic `[id]` route receives from Next. */
export function idParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

/** Gauzy gives `answer` to the call the route makes; the returned mock records that call. */
export function gauzyAnswers(answer: Response): jest.Mock {
	const fetchMock = jest.fn().mockResolvedValue(answer);
	global.fetch = fetchMock;
	return fetchMock;
}

export function restoreFetch(): void {
	global.fetch = originalFetch;
}

/** The Gauzy URL of `path`, as the route must call it (GAUZY_API_SERVER_URL ends with /api). */
export function gauzyUrl(path: string): string {
	return `${GAUZY_API_SERVER_URL}${path}`;
}

/** The one call the route made to Gauzy, once it is checked to carry the session's token and tenant. */
export function sentToGauzy(fetchMock: jest.Mock) {
	expect(fetchMock).toHaveBeenCalledTimes(1);

	const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
	expect(init.headers).toEqual(
		expect.objectContaining({ authorization: `Bearer ${SESSION.token}`, 'tenant-id': SESSION.tenantId })
	);

	return { url, method: init.method, body: parsedBody(init.body) };
}

function parsedBody(body: RequestInit['body']): unknown {
	if (typeof body !== 'string') return undefined;
	return JSON.parse(body);
}
