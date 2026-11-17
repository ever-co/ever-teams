import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /embed-credentials/config` (whether embeds are on: 404 when not). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/embed-credentials/config');
}
