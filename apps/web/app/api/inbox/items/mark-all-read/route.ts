import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `POST /inbox/items/mark-all-read`. */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/inbox/items/mark-all-read');
}
