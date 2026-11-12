import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of the platform's `POST /reaction`: adds the caller's reaction to a comment, or takes it back when
 * they already reacted with that emoji. The platform reads the comment as the caller first.
 */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/reaction');
}
