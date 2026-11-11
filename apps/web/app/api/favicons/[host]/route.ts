import { NextResponse } from 'next/server';
import { faviconsEnabled, isFaviconHost } from '@/core/lib/utils/activity-icons';
import { faviconOf, FaviconsBusyError } from '@/core/services/server/favicons';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

/** A day for a found favicon, six hours for a missing one; in the browser only (the route asks for a session). */
const FOUND_CACHE = 'private, max-age=86400, stale-while-revalidate=604800';
const MISSING_CACHE = 'private, max-age=21600';

/** The host a request names, in lower case; null when its percent-encoding is broken (`%E0%A4%A`). */
function requestedHostOf(requested: string): string | null {
	try {
		return decodeURIComponent(requested).trim().toLowerCase();
	} catch {
		return null;
	}
}

/**
 * `GET /api/favicons/:host` (#5023): a visited site's favicon, fetched by the web server (favicons.ts), so the
 * browser never asks the site itself. Off unless NEXT_PUBLIC_FAVICONS_ENABLED=true; only for a session the Gauzy
 * API accepts, since it makes this server reach a site: a cookie alone must not turn it into a fetcher for anyone.
 */
export async function GET(req: Request, props: { params: Promise<{ host: string }> }) {
	if (!faviconsEnabled()) {
		return new NextResponse(null, { status: 404 });
	}
	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer
	const { $res, user } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const { host: requested } = await props.params;
	const host = requestedHostOf(requested);
	if (host === null || !isFaviconHost(host)) {
		return new NextResponse(null, { status: 400 });
	}

	let favicon: Awaited<ReturnType<typeof faviconOf>>;
	try {
		favicon = await faviconOf(host);
	} catch (error) {
		if (error instanceof FaviconsBusyError) {
			// Not cached: the browser shows the generic icon now and may ask again later
			return new NextResponse(null, {
				status: 503,
				headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' }
			});
		}
		throw error;
	}
	if (!favicon) {
		return new NextResponse(null, { status: 404, headers: { 'Cache-Control': MISSING_CACHE } });
	}
	return new NextResponse(new Uint8Array(favicon.body), {
		status: 200,
		headers: {
			'Content-Type': favicon.type,
			'Cache-Control': FOUND_CACHE,
			'X-Content-Type-Options': 'nosniff',
			'Content-Security-Policy': "default-src 'none'; sandbox"
		}
	});
}
