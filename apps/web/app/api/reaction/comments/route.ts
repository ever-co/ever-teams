import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of Gauzy's `GET /reaction/comments`: the reactions of a task's comments, summed up (#5069). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/reaction/comments');
}
