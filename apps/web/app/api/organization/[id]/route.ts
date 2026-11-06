import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of Gauzy's `GET /organization/:id`, which the weekly limit report needs before it renders. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// Encoded, so an id such as `../user` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	const gauzyPath = `/organization/${encodedId}`;

	return forwardToGauzy(req, gauzyPath);
}
