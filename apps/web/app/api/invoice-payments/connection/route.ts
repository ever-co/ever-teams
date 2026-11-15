import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `/invoice-payments/connection`: the workspace's connection to its payment connector, read
 * (GET) and written (PUT). The first connection answers its signing secret once, so no cache keeps the exchange.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/invoice-payments/connection', { noStore: true });
}

export async function PUT(req: Request) {
	return forwardToGauzy(req, '/invoice-payments/connection', { noStore: true });
}
