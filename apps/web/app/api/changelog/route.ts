import { NextResponse } from 'next/server';
import { serverFetch } from '@/core/services/server/fetch';

/** A product key of the changelog: lowercase letters, digits and inner hyphens, at most 50 characters. */
const PLATFORM_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The public "What's new" listing of one product, forwarded to the Gauzy API. The browser comes here when the
 * deployment sets only the server-side `GAUZY_API_SERVER_URL` (proxy mode): `APIService` then sends its requests
 * to this app's `/api/*`. No session is needed, as on the Gauzy side; only `platform` and `isFeature` go through.
 */
export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const platform = searchParams.get('platform') ?? '';
	if (platform.length > 50 || !PLATFORM_KEY.test(platform)) {
		return NextResponse.json({ error: 'A product key is required, such as platform=ever-teams.' }, { status: 400 });
	}
	const isFeature = searchParams.get('isFeature') === 'true' ? 'true' : 'false';

	try {
		const { data } = await serverFetch<unknown>({
			path: `/changelog?platform=${encodeURIComponent(platform)}&isFeature=${isFeature}`,
			method: 'GET',
			init: { cache: 'no-store' }
		});
		return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300' } });
	} catch {
		return NextResponse.json({ items: [], total: 0 }, { status: 502 });
	}
}
