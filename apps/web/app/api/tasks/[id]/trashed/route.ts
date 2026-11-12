import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// The id is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/tasks/${encodeURIComponent(id)}/trashed`;
}

/**
 * Proxy mode twin of the platform's `DELETE /tasks/{id}/trashed`: deletes a task for good, only while it is in the
 * trash. Its 404 (the task was restored or deleted meanwhile, or the trash is off) comes back as it is.
 */
export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
