import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string }> };

async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id } = await params;
	return `/integration/trello/${encodeURIComponent(id)}/mappings`;
}

/** Proxy mode: the board ↔ project mappings of a connection, and a new one. */
export async function GET(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}

export async function POST(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
