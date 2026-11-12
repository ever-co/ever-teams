import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Proxy mode: a Jira connection, its summary (GET) and its removal (DELETE). The id is encoded, so a value such as
 * `../x` stays one path segment and cannot reach another endpoint.
 */
async function forwardConnection(req: Request, { params }: RouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/integration/jira/${encodeURIComponent(id)}`);
}

export const GET = forwardConnection;
export const DELETE = forwardConnection;
