import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of the platform's `GET /time-goals/progress`: where the caller, or each member of a team she may
 * read, stands against her goals. The platform narrows the members to those the caller may read.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/time-goals/progress');
}
