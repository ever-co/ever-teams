import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `GET /tasks/trash`: the deleted tasks of a team or project (#5069). A static segment,
 * so it is reached before `/api/tasks/[id]` and never read as a task called "trash".
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/tasks/trash');
}
