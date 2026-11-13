import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode: the projects of the connection's site. */
export async function GET(req: Request, { params }: RouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/integration/jira/${encodeURIComponent(id)}/projects`);
}
