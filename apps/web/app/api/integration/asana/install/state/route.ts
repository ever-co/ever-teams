import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode: starts the connect flow (the platform mints the single-use state for the organization in the body). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/integration/asana/install/state');
}
