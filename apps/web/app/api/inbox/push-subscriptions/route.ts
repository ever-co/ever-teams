import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /inbox/push-subscriptions` (my devices). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/inbox/push-subscriptions');
}

/** Proxy mode twin of the platform's `POST /inbox/push-subscriptions` (register or refresh this browser). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/inbox/push-subscriptions');
}
