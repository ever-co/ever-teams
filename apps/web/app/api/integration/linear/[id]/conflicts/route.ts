import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode: the sync conflicts of a Linear connection (`?status=`, `?runId=`, `?take=` pass through). */
export async function GET(req: Request, { params }: RouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/integration/linear/${encodeURIComponent(id)}/conflicts`);
}
