import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /inbox/items/counts`. */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/inbox/items/counts');
}
