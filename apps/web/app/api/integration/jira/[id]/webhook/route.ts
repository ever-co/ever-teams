import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode: brings the connection's webhook in line with its mappings now. */
export async function POST(req: Request, { params }: RouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/integration/jira/${encodeURIComponent(id)}/webhook`);
}
