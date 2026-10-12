import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

export function PUT(req: Request) {
	return forwardToGauzy(req, '/timesheet/status');
}
