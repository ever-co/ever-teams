import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; mappingId: string }> };

/** Proxy mode: starts an import of one mapping (`{ full }` in the body). */
export async function POST(req: Request, { params }: RouteContext) {
	const { id, mappingId } = await params;
	return forwardToGauzy(req, `/integration/asana/${encodeURIComponent(id)}/mappings/${encodeURIComponent(mappingId)}/import`);
}
