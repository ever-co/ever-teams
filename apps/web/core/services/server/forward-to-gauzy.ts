import { GAUZY_API_SERVER_URL, TENANT_ID_COOKIE_NAME } from '@/core/constants/config/constants';
import { NextResponse } from 'next/server';
import { requestAccessToken, requestCookies } from './request-cookies';

// The browser client gives up after 60 seconds (api.service.ts): past that, nobody is waiting for the answer.
const UPSTREAM_TIMEOUT_MS = 60_000;

/** The headers this proxy writes itself: a route cannot let the browser's own copy of one through. */
const SESSION_HEADERS = new Set([
	'authorization',
	'tenant-id',
	'content-type',
	'accept',
	'cookie',
	'host',
	'content-length'
]);

const unsupportedMediaType = () =>
	NextResponse.json({ statusCode: 415, message: 'Unsupported Media Type' }, { status: 415 });

/** What a route lets through besides the session, the query string and the JSON body. */
export interface ForwardToGauzyOptions {
	/**
	 * Request headers the route hands on as the browser sent them (lower-case names), for a Gauzy endpoint that reads
	 * one: the interaction route's `idempotency-key`. Every other header of the request stays here.
	 */
	forwardHeaders?: readonly string[];
}

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
export async function forwardToGauzy(
	req: Request,
	path: string,
	options: ForwardToGauzyOptions = {}
): Promise<Response> {
	const cookies = requestCookies(req);
	const access_token = requestAccessToken(cookies);
	if (!access_token) return NextResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 });
	const tenantId = cookies.get(TENANT_ID_COOKIE_NAME);

	// The token comes from a cookie, which a browser can attach to a request another site makes. Such a site can
	// post text/plain, form data or an untyped body without a CORS preflight, but not JSON, so only a JSON body is
	// forwarded. A declared type is refused before the body is read; an untyped body is only known once read.
	const mediaType = req.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
	const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
	if (hasBody && mediaType && mediaType !== 'application/json') return unsupportedMediaType();

	const body = hasBody ? (await req.text()) || undefined : undefined;
	if (body && !mediaType) return unsupportedMediaType();

	// Only the headers the route names, and never one that would replace the session's own.
	const forwarded: Record<string, string> = {};
	for (const name of options.forwardHeaders ?? []) {
		const lower = name.toLowerCase();
		if (SESSION_HEADERS.has(lower)) continue;
		const value = req.headers.get(lower);
		if (value !== null) forwarded[lower] = value;
	}

	const upstream = await fetch(`${GAUZY_API_SERVER_URL}${path}${new URL(req.url).search}`, {
		method: req.method,
		headers: {
			...forwarded,
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
