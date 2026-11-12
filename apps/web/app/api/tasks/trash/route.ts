import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of the platform's `GET /tasks/trash` (the soft-deleted tasks of a team or project, behind
 * `GAUZY_TASK_TRASH_ENABLED`): its 404 (trash off) and 403 (not a manager) come back as they are.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/tasks/trash');
}
