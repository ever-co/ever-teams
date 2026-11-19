import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of the platform's `POST /embed/authorize` (the signed-in person allows a site). The answer holds the
 * site's timer token and renewal token: no cache on the way may keep it.
 */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/embed/authorize', { noStore: true });
}
