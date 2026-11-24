/**
 * Test-only helper (never part of the app) for the app/api routes that call the API through a request helper and
 * answer with `$res`: a refusal of the API left such a handler as an unhandled rejection, and the browser got an empty
 * 500 that the app read as "Try again in a moment" (#5726). Each route's test names its calls; the cases are here.
 */

/** What the authenticated guard answers for a signed-in browser. */
export const SIGNED_IN_GUARD = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	teamId: 'team-1'
};

const FORBIDDEN = { statusCode: 403, message: 'Forbidden resource' };

/** What serverFetch throws for an answer that is not 2xx: a rejected promise of the API's error body. */
function refusalOf(body: unknown) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

/** A same-origin request to a route, with a small JSON body for the verbs that carry one. */
export function routeRequest(url: string, method: string): Request {
	const hasBody = method !== 'GET' && method !== 'DELETE';
	let body: string | undefined = undefined;
	if (hasBody) {
		body = JSON.stringify({ name: 'Sample' });
	}
	return new Request(url, {
		method,
		headers: { 'content-type': 'application/json', origin: new URL(url).origin },
		body
	});
}

/** One handler of a route: what it does in words, the call, and the mock of the request helper it calls. */
export type GuardedCall = readonly [label: string, call: () => Promise<Response>, request: jest.Mock];

/**
 * The three cases of every guarded handler: the API's refusal goes back with its status and reason, no answer from the
 * API is a 502, and an accepted call answers what the API answered.
 */
export function describeRefusalsPassedOn(title: string, guard: jest.Mock, calls: ReadonlyArray<GuardedCall>): void {
	describe(title, () => {
		beforeEach(() => {
			jest.clearAllMocks();
			guard.mockResolvedValue(SIGNED_IN_GUARD);
		});

		it.each(calls)("passes the API's 403 on for %s", async (_case, call, request) => {
			request.mockRejectedValue(refusalOf(FORBIDDEN));

			const response = await call();

			expect(response.status).toBe(403);
			expect(await response.json()).toEqual(FORBIDDEN);
		});

		it.each(calls)('answers 502 for %s the API gave no answer to', async (_case, call, request) => {
			request.mockRejectedValue(new TypeError('fetch failed'));

			const response = await call();

			expect(response.status).toBe(502);
		});

		it.each(calls)('answers what the API answered for %s it accepts', async (_case, call, request) => {
			request.mockResolvedValue({ data: { id: 'row-1' } });

			const response = await call();

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ id: 'row-1' });
		});
	});
}
