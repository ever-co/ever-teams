import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type InboxItemRouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of the platform's `PATCH /inbox/items/:id/state` (read, archive, snooze, done). */
export async function PATCH(req: Request, context: InboxItemRouteContext) {
	const { id } = await context.params;
	return forwardToGauzy(req, `/inbox/items/${encodeURIComponent(id)}/state`);
}
