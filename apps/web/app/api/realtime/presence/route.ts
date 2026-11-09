import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode: the tab's presence signal, with the session's token. */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/realtime/presence');
}
