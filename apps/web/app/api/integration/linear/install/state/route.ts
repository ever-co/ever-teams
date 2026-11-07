import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode: the single-use state that starts the Linear connect flow. */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/integration/linear/install/state');
}
