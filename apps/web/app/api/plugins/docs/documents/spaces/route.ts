import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twins of the platform's `/plugins/docs/documents/spaces` (GET). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/plugins/docs/documents/spaces');
}
