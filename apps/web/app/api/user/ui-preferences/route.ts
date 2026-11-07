import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twins of the platform's `/user/ui-preferences` (PUT). */
export async function PUT(req: Request) {
	return forwardToGauzy(req, '/user/ui-preferences');
}
