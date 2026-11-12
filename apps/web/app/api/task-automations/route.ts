import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /task-automations` (the organization's rules, in their order). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/task-automations');
}

/** Proxy mode twin of the platform's `POST /task-automations` (a rule, blank or from a template). */
export async function POST(req: Request) {
	return forwardToGauzy(req, '/task-automations');
}
