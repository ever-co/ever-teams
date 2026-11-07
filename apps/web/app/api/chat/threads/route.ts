import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `/chat/threads` (GET). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/chat/threads');
}
