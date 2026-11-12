import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of Gauzy's `PUT /comment/:id/recover`: a withdrawn comment brought back (#5069). */
export async function PUT(req: Request, { params }: RouteContext) {
	// Encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
	return forwardToGauzy(req, `/comment/${encodeURIComponent((await params).id)}/recover`);
}
