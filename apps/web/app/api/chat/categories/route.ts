import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twins of the platform's `/chat/categories` (GET, POST). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/chat/categories');
}

export async function POST(req: Request) {
	return forwardToGauzy(req, '/chat/categories');
}
