import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/chat/messages/${encodeURIComponent(id)}/interactions`;
}

/**
 * Proxy mode twin of the platform's `/chat/messages/{id}/interactions` (POST): a click on an app message's button. The
 * click's `Idempotency-Key` goes on with it, as in direct mode: the platform answers a repeat of the key with the first
 * click and calls the app no second time.
 */
export async function POST(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context), { forwardHeaders: ['idempotency-key'] });
}
