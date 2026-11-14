import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// The id is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/auth/sessions/${encodeURIComponent(id)}`;
}

/**
 * Proxy mode twin of Gauzy's `/auth/sessions/{id}` (DELETE): signs out one session of the signed-in user. Gauzy
 * refuses another user's session and the request's own one.
 */
export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
