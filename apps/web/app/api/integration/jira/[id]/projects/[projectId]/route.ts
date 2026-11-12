import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; projectId: string }> };

/** Proxy mode: one Jira project with its issue types and statuses. */
export async function GET(req: Request, { params }: RouteContext) {
	const { id, projectId } = await params;
	return forwardToGauzy(req, `/integration/jira/${encodeURIComponent(id)}/projects/${encodeURIComponent(projectId)}`);
}
