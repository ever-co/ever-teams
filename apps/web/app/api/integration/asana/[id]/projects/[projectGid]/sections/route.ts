import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; projectGid: string }> };

/** Proxy mode: the sections of one Asana project. */
export async function GET(req: Request, { params }: RouteContext) {
	const { id, projectGid } = await params;
	return forwardToGauzy(req, `/integration/asana/${encodeURIComponent(id)}/projects/${encodeURIComponent(projectGid)}/sections`);
}
