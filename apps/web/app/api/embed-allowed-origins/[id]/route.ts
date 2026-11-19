import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type OriginRouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of the platform's `PATCH /embed-allowed-origins/:id` (whether people can sign in from the site). */
export async function PATCH(req: Request, { params }: OriginRouteContext) {
	const { id } = await params;
	// Encoded, so an id stays one path segment instead of reaching another endpoint.
	return forwardToGauzy(req, `/embed-allowed-origins/${encodeURIComponent(id)}`);
}

/** Proxy mode twin of the platform's `DELETE /embed-allowed-origins/:id`. */
export async function DELETE(req: Request, { params }: OriginRouteContext) {
	const { id } = await params;
	// Encoded, so an id stays one path segment instead of reaching another endpoint.
	return forwardToGauzy(req, `/embed-allowed-origins/${encodeURIComponent(id)}`);
}
