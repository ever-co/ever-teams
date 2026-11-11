import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; conflictId: string }> };

/** Proxy mode: resolves a sync conflict of a Asana connection (`{ keep: 'external' | 'platform' }`). */
export async function POST(req: Request, { params }: RouteContext) {
	const { id, conflictId } = await params;
	return forwardToGauzy(
		req,
		`/integration/asana/${encodeURIComponent(id)}/conflicts/${encodeURIComponent(conflictId)}/resolve`
	);
}
