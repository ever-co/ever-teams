import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of the platform's `PUT /time-goals/{id}/restore`: an archived goal counts again. */
export async function PUT(req: Request, { params }: RouteContext) {
	const { id } = await params;
	// The id is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
	return forwardToGauzy(req, `/time-goals/${encodeURIComponent(id)}/restore`);
}
