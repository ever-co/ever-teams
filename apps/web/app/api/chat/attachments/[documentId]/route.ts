import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ documentId: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { documentId } = await params;
	return `/chat/attachments/${encodeURIComponent(documentId)}`;
}

/** Proxy mode twin of the platform's `/chat/attachments/{documentId}` (DELETE): an upload that was never sent. */
export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
