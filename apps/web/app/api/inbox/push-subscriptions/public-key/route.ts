import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /inbox/push-subscriptions/public-key` (the VAPID public key). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/inbox/push-subscriptions/public-key');
}
