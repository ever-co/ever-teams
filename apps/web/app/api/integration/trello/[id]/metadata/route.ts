import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode: who the connection is, and the boards it may see. */
export async function GET(req: Request, { params }: RouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/integration/trello/${encodeURIComponent(id)}/metadata`);
}
