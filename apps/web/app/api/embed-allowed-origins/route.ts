import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /embed-allowed-origins` (the sites allowed to embed the organization). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/embed-allowed-origins');
}

/** Proxy mode twin of the platform's `POST /embed-allowed-origins` (normalized by the platform). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/embed-allowed-origins');
}
