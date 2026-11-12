import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /reaction/comments` (the reactions on the comments of one record). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/reaction/comments');
}
