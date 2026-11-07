import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/plugins/docs/documents/${encodeURIComponent(id)}/archive`;
}

/** Proxy mode twins of the platform's `/plugins/docs/documents/{id}/archive` (POST). */
export async function POST(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
