import { NextResponse } from 'next/server';

/**
 * Streams an image from the server-side Gauzy origin through this app (the /api/public-assets and
 * /api/placeholder routes). `upstream` is built from server configuration plus validated segments, never
 * from a raw request value.
 *
 * An error page from the API (HTML, JSON) is not an image: it answers 404 instead of being passed on.
 */
export async function proxyGauzyImage(
	label: string,
	upstream: string,
	accept: string,
	extraHeaders: Record<string, string> = {}
): Promise<NextResponse> {
	if (!/^https?:\/\//i.test(upstream)) {
		console.error(`[WEB][API] ${label}: the configured API origin is not http(s): ${upstream}`);
		return new NextResponse(null, { status: 500 });
	}

	const response = await fetch(upstream, { headers: { Accept: accept } }).catch((error) => {
		console.error(`[WEB][API] ${label}: ${upstream} is unreachable`, error);
		return undefined;
	});

	const contentType = response?.headers.get('content-type') ?? '';
	if (!response?.ok || !contentType.startsWith('image/')) return new NextResponse(null, { status: 404 });

	return new NextResponse(response.body, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			// Static images; but an upstream `no-store` (e.g. a degraded answer) is never turned into public caching.
			'Cache-Control': /no-store/i.test(response.headers.get('cache-control') ?? '')
				? 'no-store'
				: 'public, max-age=3600, stale-while-revalidate=86400',
			'X-Content-Type-Options': 'nosniff',
			...extraHeaders
		}
	});
}
