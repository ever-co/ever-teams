import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

type InboxPushDeviceRouteContext = { params: Promise<{ id: string }> };

/** Proxy mode twin of the platform's `DELETE /inbox/push-subscriptions/:id` (remove one of my devices). */
export async function DELETE(req: Request, { params }: InboxPushDeviceRouteContext) {
	const { id } = await params;
	// Encoded, so an id such as `../public-key` stays one path segment.
	return forwardToGauzy(req, `/inbox/push-subscriptions/${encodeURIComponent(id)}`);
}
