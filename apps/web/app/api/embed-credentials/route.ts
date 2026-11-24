import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /embed-credentials` (the organization's credentials, never their secret). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/embed-credentials');
}

/** Proxy mode twin of the platform's `POST /embed-credentials`: the answer holds the secret, shown once. */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/embed-credentials', { noStore: true });
}
