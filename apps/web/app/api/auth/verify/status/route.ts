import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `GET /auth/email/verify/status`: whether the signed-in user still has to verify their
 * address. Gauzy's 404 on a deployment that verifies no address is passed on as it is, since that answer is what tells
 * the app to ask nobody for a code.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/auth/email/verify/status', { noStore: true });
}
