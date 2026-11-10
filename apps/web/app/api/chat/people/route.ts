import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `/chat/people` (GET): the people of the organization one can write to. */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/chat/people');
}
