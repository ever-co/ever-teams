import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `POST /invoice-payments/connection/rotate-secret`: gives the payment connector a new
 * signing secret, which the answer carries once, so no cache keeps it.
 */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/invoice-payments/connection/rotate-secret', { noStore: true });
}
