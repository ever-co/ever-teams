import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twins of the platform's `/plugins/docs/documents/reorder` (POST). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/plugins/docs/documents/reorder');
}
