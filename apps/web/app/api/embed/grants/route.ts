import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of the platform's `GET /embed/grants`: the sites the signed-in person allowed to use their timer.
 * The platform answers with this person's own only; the answer is personal, so no cache keeps it.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/embed/grants', { noStore: true });
}
