import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type CredentialRouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of the platform's `DELETE /embed-credentials/:id` (revokes it: its tokens stop within 30 s). */
export async function DELETE(req: Request, { params }: CredentialRouteContext) {
	const { id } = await params;
	// Encoded, so an id such as `../config` stays one path segment instead of reaching another endpoint.
	return forwardToGauzy(req, `/embed-credentials/${encodeURIComponent(id)}`);
}
