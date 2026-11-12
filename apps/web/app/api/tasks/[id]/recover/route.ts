import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of Gauzy's `PUT /tasks/:id/recover`: a task restored from the trash (#5069). */
export async function PUT(req: Request, { params }: RouteContext) {
	// Encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
	return forwardToGauzy(req, `/tasks/${encodeURIComponent((await params).id)}/recover`);
}
