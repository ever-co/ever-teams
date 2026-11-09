import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode: the catch-up listing of the real-time channel, with the session's token. */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/realtime/events');
}
