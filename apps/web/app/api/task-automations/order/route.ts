import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `PUT /task-automations/order` (the organization's rules in a new order). */
export async function PUT(req: Request) {
	return forwardToGauzy(req, '/task-automations/order');
}
