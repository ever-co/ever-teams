import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/chat/messages/${encodeURIComponent(id)}/interactions`;
}

/** Proxy mode twin of the platform's `/chat/messages/{id}/interactions` (POST): a click on an app message's button. */
export async function POST(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
