import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode: chooses the connection's site (`{ cloudId }` in the body). */
export async function PUT(req: Request, { params }: RouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/integration/jira/${encodeURIComponent(id)}/site`);
}
