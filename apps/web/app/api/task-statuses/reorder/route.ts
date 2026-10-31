import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `PATCH /task-statuses/reorder`, which saves the order set in the task statuses settings.
 * Without this static segment, proxy mode sent the request to task-statuses/[id] with id "reorder", which has no PATCH.
 */
export function PATCH(req: Request) {
	return forwardToGauzy(req, '/task-statuses/reorder');
}
