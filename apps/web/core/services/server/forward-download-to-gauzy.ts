import { GAUZY_API_SERVER_URL, TENANT_ID_COOKIE_NAME } from '@/core/constants/config/constants';
import { NextResponse } from 'next/server';
import { requestAccessToken, requestCookies } from './request-cookies';

/** A PDF of a large subtree takes a while to render; past this nobody is waiting for it any more. */
const UPSTREAM_TIMEOUT_MS = 120_000;

/** The headers of a file answer that travel back to the browser (the name of the download among them). */
const PASSED_HEADERS = ['content-type', 'content-length', 'content-disposition', 'cache-control', 'x-content-type-options'];

/**
 * Hands a proxy mode GET of a file (a PDF, a zip) on to the Gauzy endpoint the browser calls in direct mode, with the
 * session's token, and streams Gauzy's answer back with its status and the headers of a download. Unlike
 * `forwardToGauzy`, which answers JSON, this keeps `Content-Disposition`, so the file keeps the name Gauzy gives it.
 *
 * The route fixes `path`; only the query string comes from the request.
 */
export async function forwardDownloadToGauzy(req: Request, path: string): Promise<Response> {
	const cookies = requestCookies(req);
	const access_token = requestAccessToken(cookies);
	if (!access_token) return NextResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 });
	const tenantId = cookies.get(TENANT_ID_COOKIE_NAME);

	const upstream = await fetch(`${GAUZY_API_SERVER_URL}${path}${new URL(req.url).search}`, {
		method: 'GET',
		headers: {
			Accept: 'application/pdf, application/zip, application/json',
			authorization: `Bearer ${access_token}`,
			...(tenantId ? { 'tenant-id': tenantId } : {})
		},
		signal: AbortSignal.any([req.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)])
	}).catch((error: Error) => error);

	if (!(upstream instanceof Response)) {
		if (req.signal.aborted) return new NextResponse(null, { status: 499 });
		const timedOut = upstream.name === 'TimeoutError';
		const status = timedOut ? 504 : 502;
		const message = timedOut ? 'The Gauzy API did not answer in time' : 'The Gauzy API is unreachable';
		console.error(`[WEB][API] GET ${path}: ${message}`, upstream);
		return NextResponse.json({ statusCode: status, message }, { status });
	}

	const headers = new Headers();
	for (const name of PASSED_HEADERS) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	if (!headers.has('content-type')) headers.set('content-type', 'application/octet-stream');
	return new NextResponse(upstream.body, { status: upstream.status, headers });
}
