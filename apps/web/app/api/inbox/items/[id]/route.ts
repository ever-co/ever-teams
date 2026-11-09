import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type InboxItemRouteContext = { params: Promise<{ id: string }> };

// Encoded, so an id such as `../counts` stays one path segment instead of reaching another endpoint.
async function inboxItemPathOf({ params }: InboxItemRouteContext): Promise<string> {
	const { id } = await params;
	return `/inbox/items/${encodeURIComponent(id)}`;
}

/** Proxy mode twin of the platform's `GET /inbox/items/:id`. */
export async function GET(req: Request, context: InboxItemRouteContext) {
	return forwardToGauzy(req, await inboxItemPathOf(context));
}
