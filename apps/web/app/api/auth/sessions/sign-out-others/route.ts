import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `/auth/sessions/sign-out-others` (POST): signs out every other session of the signed-in
 * user, once the password (or, for an account without one, the e-mailed sign-in code) proves it is them. The body
 * carries that proof, so no cache keeps the exchange.
 */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/auth/sessions/sign-out-others', { noStore: true });
}
