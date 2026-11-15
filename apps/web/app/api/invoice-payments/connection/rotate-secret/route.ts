import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

/**
 * Proxy mode twin of Gauzy's `POST /invoice-payments/connection/rotate-secret`: gives the payment connector a new
 * signing secret, which the answer carries once, so no cache keeps it. The request has no body, which another site can
 * post with the session's cookies without a CORS preflight: it must come from this app's own pages.
 */
export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	return forwardToGauzy(req, '/invoice-payments/connection/rotate-secret', { noStore: true });
}
