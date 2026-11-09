import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode: a typing signal from a chat composer, with the session's token. */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/realtime/typing');
}
