import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/chat/conversations/${encodeURIComponent(id)}/webhooks`;
}

/**
 * Proxy mode twins of the platform's `/chat/conversations/{id}/webhooks`: a channel's incoming webhooks (GET) and a new
 * one (POST, whose answer holds its URL and signing secret, this once). Gauzy's answer goes back as it is (a 404 where
 * its webhooks are off, a 403 to a member who does not manage the channel), marked `no-store` as Gauzy marks it.
 */
export async function GET(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context), { noStore: true });
}

export async function POST(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context), { noStore: true });
}
