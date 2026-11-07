import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twins of the platform's `/tasks/bulk-update` (POST). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/tasks/bulk-update');
}
