import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id, commentId } = await params;
	return `/plugins/docs/documents/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/anchor`;
}

/** Proxy mode twins of the platform's `/plugins/docs/documents/{id}/comments/{commentId}/anchor` (PUT, DELETE). */
export async function PUT(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}

export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
