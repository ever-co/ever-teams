import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id, taskId } = await params;
	return `/chat/messages/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`;
}

/** Proxy mode twin of the platform's `/chat/messages/{id}/tasks/{taskId}` (PATCH): a task changed from its card. */
export async function PATCH(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
