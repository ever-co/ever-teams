import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /task-automations/templates` (the built-in templates). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/task-automations/templates');
}
