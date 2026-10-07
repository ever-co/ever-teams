import { GAUZY_API_SERVER_ORIGIN } from '@/core/constants/config/constants';
import { publicAssetUrl } from '@/core/lib/helpers/public-asset-url';
import { NextResponse } from 'next/server';

/**
 * Streams a Gauzy `public/` file — the task status, priority and size icons — through this app.
 *
 * A deployment that publishes no API origin to the browser (NEXT_PUBLIC_GAUZY_API_SERVER_URL unset:
 * the browser calls the API through this app's /api routes) has no URL the browser can load those
 * icons from, and the code used to fall back to https://api.ever.team — Ever's API, requested from a
 * self-hosted instance. This route serves them from the origin the /api routes already proxy to.
 *
 * The upstream origin is server configuration, never a request value, and every path segment must be
 * a plain file name, so no request can point this at another host or escape `<origin>/public/`.
 * Gauzy serves these files publicly, so the route is unauthenticated, exactly like the direct URL.
 */

/** One path segment. Starting alphanumeric rejects `.`, `..` and dotfiles outright. */
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Only what an icon can be; anything else is not this route's business. */
const SAFE_EXTENSION = /\.(svg|png|jpe?g|webp|gif|ico)$/i;
const MAX_SEGMENTS = 8;

const notFound = () => new NextResponse(null, { status: 404 });

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	const segments = (await params).path ?? [];

	if (
		segments.length === 0 ||
		segments.length > MAX_SEGMENTS ||
		!segments.every((segment) => SAFE_SEGMENT.test(segment)) ||
		!SAFE_EXTENSION.test(segments[segments.length - 1])
	) {
		return notFound();
	}

	const upstream = publicAssetUrl(segments.join('/'), GAUZY_API_SERVER_ORIGIN);
	if (!/^https?:\/\//i.test(upstream)) {
		console.error(`[WEB][API] public-assets: the configured API origin is not http(s): ${upstream}`);
		return new NextResponse(null, { status: 500 });
	}

	const response = await fetch(upstream, { headers: { Accept: 'image/*' } }).catch((error) => {
		console.error(`[WEB][API] public-assets: ${upstream} is unreachable`, error);
		return undefined;
	});

	const contentType = response?.headers.get('content-type') ?? '';
	// An error page from the API (HTML, JSON) is not an asset: never pass it on as one.
	if (!response?.ok || !contentType.startsWith('image/')) return notFound();

	return new NextResponse(response.body, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			// Static icons; the API's SVGs now come from THIS origin, so lock them down the way Next's own
			// optimizer does before it serves an SVG.
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
			'Content-Security-Policy': "script-src 'none'; frame-src 'none'; sandbox;",
			'X-Content-Type-Options': 'nosniff'
		}
	});
}
