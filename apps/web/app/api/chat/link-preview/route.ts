import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of the platform's `/chat/link-preview` (GET): the preview of a link posted in a message, which the
 * platform fetched (`?url=` is passed on as it came; the platform checks it).
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/chat/link-preview');
}
