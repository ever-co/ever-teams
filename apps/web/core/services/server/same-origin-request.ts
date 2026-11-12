import { NextResponse } from 'next/server';

/**
 * Why a request that changes something must not reach the platform, or null when it may: it must come from this app's
 * own pages.
 *
 * A proxy route acts with the caller's session cookies, which the browser also attaches to a request another site
 * makes (always for a sibling subdomain, and from any site when the deployment sets `NEXT_PUBLIC_COOKIE_SAME_SITE=none`).
 * A JSON body cannot be sent that way without a CORS preflight this app never grants, but a form can: a route that
 * takes a multipart body checks where the request comes from instead. It is refused when the browser says it comes
 * from another site (`Sec-Fetch-Site: cross-site` or `same-site`), or when its `Origin` is not this host.
 *
 * @param req The incoming request.
 * @returns A 403 answer, or null when the request comes from this app.
 */
export function refuseForeignOrigin(req: Request): NextResponse | null {
	const fetchSite = req.headers.get('sec-fetch-site');
	if (fetchSite === 'cross-site' || fetchSite === 'same-site') return refused();

	const origin = req.headers.get('origin');
	if (origin) {
		const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host).split(',')[0].trim();
		let originHost: string | null = null;
		try {
			originHost = new URL(origin).host;
		} catch {
			originHost = null;
		}
		if (originHost !== host) return refused();
	}
	return null;
}

function refused(): NextResponse {
	return NextResponse.json({ statusCode: 403, message: 'Cross-site request refused' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}
