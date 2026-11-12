import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode: the Jira project ↔ project mappings of a connection (GET), and a new one (POST). */
async function forwardMappings(req: Request, { params }: RouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/integration/jira/${encodeURIComponent(id)}/mappings`);
}

export const GET = forwardMappings;
export const POST = forwardMappings;
