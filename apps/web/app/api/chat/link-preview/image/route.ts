import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of the platform's `/chat/link-preview/image` (GET): the picture of a link's preview, which the
 * platform fetched and serves itself (`?url=` is the link, not the picture; the platform checks it). The bytes and
 * their type pass on as the platform answered, with its status (204: no picture, 404: pictures off).
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/chat/link-preview/image');
}
