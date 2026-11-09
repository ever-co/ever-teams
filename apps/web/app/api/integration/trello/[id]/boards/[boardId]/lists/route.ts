import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; boardId: string }> };

/** Proxy mode: the lists of one Trello board. */
export async function GET(req: Request, { params }: RouteContext) {
	const { id, boardId } = await params;
	return forwardToGauzy(req, `/integration/trello/${encodeURIComponent(id)}/boards/${encodeURIComponent(boardId)}/lists`);
}
