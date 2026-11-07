import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; mappingId: string }> };

async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id, mappingId } = await params;
	return `/integration/linear/${encodeURIComponent(id)}/mappings/${encodeURIComponent(mappingId)}`;
}

/** Proxy mode: a change to one mapping, and its removal. */
export async function PUT(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}

export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
