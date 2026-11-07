import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type RouteContext = { params: Promise<{ id: string; employeeId: string }> };

// Each parameter is encoded, so a value such as `../x` stays one path segment and cannot reach another endpoint.
async function gauzyPathOf({ params }: RouteContext): Promise<string> {
	const { id, employeeId } = await params;
	return `/chat/conversations/${encodeURIComponent(id)}/members/${encodeURIComponent(employeeId)}`;
}

/** Proxy mode twin of the platform's `/chat/conversations/{id}/members/{employeeId}` (DELETE). */
export async function DELETE(req: Request, context: RouteContext) {
	return forwardToGauzy(req, await gauzyPathOf(context));
}
