import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

/**
 * Proxy mode twin of Gauzy's `/invoice-payments/connection`: the workspace's connection to its payment connector, read
 * (GET) and written (PUT). The first connection answers its signing secret once, so no cache keeps the exchange. A
 * write must come from this app's own pages.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/invoice-payments/connection', { noStore: true });
}

export async function PUT(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	return forwardToGauzy(req, '/invoice-payments/connection', { noStore: true });
}
