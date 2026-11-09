import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy mode: the latest runs of a connection (`?take=` passes through). */
export async function GET(req: Request, { params }: RouteContext) {
	const { id } = await params;
	return forwardToGauzy(req, `/integration/asana/${encodeURIComponent(id)}/runs`);
}
