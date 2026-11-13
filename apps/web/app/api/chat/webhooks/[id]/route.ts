import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/chat/webhooks/${encodeURIComponent(id)}`;
}

/**
 * Proxy mode twins of the platform's `/chat/webhooks/{id}`: a webhook's changes (PATCH, whose answer holds a new
 * signing secret when an interaction URL is set on a webhook without one) and its revocation (DELETE); answered
 * `no-store`.
 */
export async function PATCH(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context), { noStore: true });
}

export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context), { noStore: true });
}
