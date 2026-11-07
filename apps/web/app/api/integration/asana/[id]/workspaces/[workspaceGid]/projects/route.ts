import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; workspaceGid: string }> };

/** Proxy mode: the projects of one Asana workspace. */
export async function GET(req: Request, { params }: RouteContext) {
	const { id, workspaceGid } = await params;
	return forwardToGauzy(req, `/integration/asana/${encodeURIComponent(id)}/workspaces/${encodeURIComponent(workspaceGid)}/projects`);
}
