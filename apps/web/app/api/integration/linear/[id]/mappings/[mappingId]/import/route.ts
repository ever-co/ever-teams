import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; mappingId: string }> };

/** Proxy mode: an import of a mapped team's issues now. */
export async function POST(req: Request, { params }: RouteContext) {
	const { id, mappingId } = await params;
	return forwardToGauzy(req, `/integration/linear/${encodeURIComponent(id)}/mappings/${encodeURIComponent(mappingId)}/import`);
}
