import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; mappingId: string }> };

/** Proxy mode: registers the mapping's webhook on Trello again. */
export async function POST(req: Request, { params }: RouteContext) {
	const { id, mappingId } = await params;
	return forwardToGauzy(req, `/integration/trello/${encodeURIComponent(id)}/mappings/${encodeURIComponent(mappingId)}/webhook`);
}
