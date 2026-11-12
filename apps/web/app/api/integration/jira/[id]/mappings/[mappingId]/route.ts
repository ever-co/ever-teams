import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; mappingId: string }> };

/** Proxy mode: a change to one mapping (PUT), and its removal (DELETE). */
async function forwardMapping(req: Request, { params }: RouteContext) {
	const { id, mappingId } = await params;
	return forwardToGauzy(req, `/integration/jira/${encodeURIComponent(id)}/mappings/${encodeURIComponent(mappingId)}`);
}

export const PUT = forwardMapping;
export const DELETE = forwardMapping;
