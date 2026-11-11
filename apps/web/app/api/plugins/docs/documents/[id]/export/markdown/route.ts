import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/plugins/docs/documents/${encodeURIComponent(id)}/export/markdown`;
}

/** Proxy mode twin of the platform's `/plugins/docs/documents/{id}/export/markdown` (GET; `?subtree=true` answers a zip). */
export async function GET(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
