import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { getAccessTokenCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { NextResponse } from 'next/server';

// The browser client gives up after 60 seconds (api.service.ts): past that, nobody is waiting for the answer.
const UPSTREAM_TIMEOUT_MS = 60_000;

/**
 * Hands a proxy mode request (the browser calls this app's /api routes) on to the Gauzy endpoint the browser
 * calls in direct mode, with the session's token, and answers with Gauzy's own status and body, so both modes
 * succeed and fail the same way.
 *
 * Gauzy checks the token itself, as in direct mode: an invalid session gets Gauzy's 401, while an outage gets a
 * 502 or 504 below and never a 401 that would sign the user out.
 *
 * The route fixes `path`; only the query string and the body come from the request, so a caller cannot point
 * this at another Gauzy endpoint.
 */
export async function forwardToGauzy(req: Request, path: string): Promise<Response> {
	const ctx = { req, res: new NextResponse() };
	const access_token = getAccessTokenCookie(ctx);
	if (!access_token) return NextResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 });
	const tenantId = getTenantIdCookie(ctx);

	const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : (await req.text()) || undefined;

	const upstream = await fetch(`${GAUZY_API_SERVER_URL}${path}${new URL(req.url).search}`, {
		method: req.method,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			authorization: `Bearer ${access_token}`,
			...(tenantId ? { 'tenant-id': tenantId } : {})
		},
		body,
		// A browser that cancels its request, or a Gauzy that stops answering, releases the connection.
		signal: AbortSignal.any([req.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)])
	}).catch((error: Error) => error);

	if (!(upstream instanceof Response)) {
		// The browser cancelled (Next aborts with a `ResponseAborted` error, not an `AbortError`): nobody reads
		// this answer and Gauzy did not fail, so there is nothing to log.
		if (req.signal.aborted) return new NextResponse(null, { status: 499 });

		const timedOut = upstream.name === 'TimeoutError';
		const status = timedOut ? 504 : 502;
		const message = timedOut ? 'The Gauzy API did not answer in time' : 'The Gauzy API is unreachable';
		console.error(`[WEB][API] ${req.method} ${path}: ${message}`, upstream);
		return NextResponse.json({ statusCode: status, message }, { status });
	}

	return new NextResponse(upstream.body, {
		status: upstream.status,
		headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' }
	});
}
