import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of Gauzy's `POST /reaction`: a reaction added to (or taken off) a comment (#5069). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/reaction');
}
