import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { NextResponse } from 'next/server';
import { authenticatedGuard } from './guards/authenticated-guard-app';

/**
 * Hands a proxy mode request (the browser calls this app's /api routes) on to the Gauzy endpoint the browser
 * calls in direct mode, with the session's token, and answers with Gauzy's own status and body, so both modes
 * succeed and fail the same way.
 *
 * The route fixes `path`; only the query string and the body come from the request, so a caller cannot point
 * this at another Gauzy endpoint.
 */
export async function forwardToGauzy(req: Request, path: string): Promise<Response> {
	const { user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return NextResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 });

	const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : (await req.text()) || undefined;

	const upstream = await fetch(`${GAUZY_API_SERVER_URL}${path}${new URL(req.url).search}`, {
		method: req.method,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			authorization: `Bearer ${access_token}`,
			...(tenantId ? { 'tenant-id': tenantId } : {})
		},
		body
	}).catch((error) => {
		console.error(`[WEB][API] ${req.method} ${path}: the Gauzy API is unreachable`, error);
		return undefined;
	});

	if (!upstream) {
		return NextResponse.json({ statusCode: 502, message: 'The Gauzy API is unreachable' }, { status: 502 });
	}

	return new NextResponse(upstream.body, {
		status: upstream.status,
		headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' }
	});
}
