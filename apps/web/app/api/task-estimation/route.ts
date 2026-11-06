import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of Gauzy's `POST /task-estimation`: adds a member's estimate to a task. */
export function POST(req: Request) {
	return forwardToGauzy(req, '/task-estimation');
}
