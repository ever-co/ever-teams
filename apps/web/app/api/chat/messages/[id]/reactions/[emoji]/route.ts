import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; emoji: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id, emoji } = await params;
	return `/chat/messages/${encodeURIComponent(id)}/reactions/${encodeURIComponent(emoji)}`;
}

/** Proxy mode twins of the platform's `/chat/messages/{id}/reactions/{emoji}` (POST, DELETE). */
export async function POST(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}

export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
