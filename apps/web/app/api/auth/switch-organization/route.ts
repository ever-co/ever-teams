import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `POST /auth/switch-organization`: new tokens for another organization of the caller's
 * tenant. Gauzy checks the token, the membership and the permission itself, as in direct mode.
 */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/auth/switch-organization');
}
