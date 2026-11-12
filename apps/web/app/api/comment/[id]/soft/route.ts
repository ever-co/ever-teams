import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// The id is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/comment/${encodeURIComponent(id)}/soft`;
}

/** Proxy mode twin of the platform's `DELETE /comment/{id}/soft`: withdraws a comment (its author's), undone by recover. */
export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
