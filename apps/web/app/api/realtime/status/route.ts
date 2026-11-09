import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode: whether the platform serves the real-time channel, with the session's token. */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/realtime/status');
}
