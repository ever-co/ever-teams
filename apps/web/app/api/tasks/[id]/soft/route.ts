import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of Gauzy's `DELETE /tasks/:id/soft`: a task moved to the trash (#5069). */
export async function DELETE(req: Request, { params }: RouteContext) {
	// Encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
	return forwardToGauzy(req, `/tasks/${encodeURIComponent((await params).id)}/soft`);
}
