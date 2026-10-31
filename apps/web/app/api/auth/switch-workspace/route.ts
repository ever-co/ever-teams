import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `POST /auth/switch-workspace`: new tokens for another workspace (tenant) of the caller.
 * Gauzy checks the token and the caller's account in that workspace itself, as in direct mode.
 */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/auth/switch-workspace');
}
