import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /inbox/items` (a page of the caller's inbox items). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/inbox/items');
}
