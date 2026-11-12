import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// The id is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/comment/${encodeURIComponent(id)}/recover`;
}

/** Proxy mode twin of the platform's `PUT /comment/{id}/recover`: brings a withdrawn comment back (the undo of a delete). */
export async function PUT(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
