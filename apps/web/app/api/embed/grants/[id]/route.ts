import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type GrantRouteContext = { params: Promise<{ id: string }> };

/**
 * Proxy mode twin of the platform's `DELETE /embed/grants/:id`: ends the sign-in of one site the signed-in person
 * allowed. The platform answers 404 for a sign-in that is not this person's.
 */
export async function DELETE(req: Request, { params }: GrantRouteContext) {
	const { id } = await params;
	// Encoded, so an id stays one path segment instead of reaching another endpoint.
	return forwardToGauzy(req, `/embed/grants/${encodeURIComponent(id)}`);
}
