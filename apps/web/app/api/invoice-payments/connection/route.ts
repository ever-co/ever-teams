import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

/**
 * Proxy mode twin of Gauzy's `/invoice-payments/connection`: the workspace's connection to its payment connector, read
 * (GET) and written (PUT). The first connection answers its signing secret once, so no cache keeps the exchange. The
 * read can answer that secret too, so it is refused, as the write is, unless it comes from this app's own pages (a
 * client that is no browser sends no Origin and is left to the session check).
 */
export async function GET(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	return forwardToGauzy(req, '/invoice-payments/connection', { noStore: true });
}

export async function PUT(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	return forwardToGauzy(req, '/invoice-payments/connection', { noStore: true });
}
