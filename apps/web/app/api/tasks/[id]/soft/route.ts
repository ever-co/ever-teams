import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// The id is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/tasks/${encodeURIComponent(id)}/soft`;
}

/** Proxy mode twin of the platform's `DELETE /tasks/{id}/soft`: moves a task to the trash, under the grants a delete takes. */
export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
