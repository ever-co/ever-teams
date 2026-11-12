import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `/chat/categories/reorder` (POST). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/chat/categories/reorder');
}
