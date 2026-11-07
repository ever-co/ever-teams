import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type InboxReplyRouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of the platform's `POST /inbox/items/:id/reply` (answer a question, an approval, an escalation). */
export async function POST(req: Request, { params }: InboxReplyRouteContext) {
	const { id } = await params;
	// Encoded, so an id such as `../counts` stays one path segment.
	return forwardToGauzy(req, `/inbox/items/${encodeURIComponent(id)}/reply`);
}
