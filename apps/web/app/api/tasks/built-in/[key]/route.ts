import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ key: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { key } = await params;
	return `/tasks/built-in/${encodeURIComponent(key)}`;
}

/** Proxy mode twins of the platform's `/tasks/built-in/{key}` (GET). */
export async function GET(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
