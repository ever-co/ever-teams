import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; teamId: string }> };

/** Proxy mode: one Linear team with its workflow states and labels. */
export async function GET(req: Request, { params }: RouteContext) {
	const { id, teamId } = await params;
	return forwardToGauzy(req, `/integration/linear/${encodeURIComponent(id)}/teams/${encodeURIComponent(teamId)}`);
}
