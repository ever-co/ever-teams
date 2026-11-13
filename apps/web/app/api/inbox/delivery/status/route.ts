import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /inbox/delivery/status` (whether emails and web push can deliver). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/inbox/delivery/status');
}
