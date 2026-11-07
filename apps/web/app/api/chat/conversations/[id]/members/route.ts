import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/chat/conversations/${encodeURIComponent(id)}/members`;
}

/** Proxy mode twins of the platform's `/chat/conversations/{id}/members` (GET, POST). */
export async function GET(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}

export async function POST(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
