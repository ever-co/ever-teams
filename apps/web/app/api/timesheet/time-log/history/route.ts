import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** The changes made to time entries over a period; Gauzy reads them only for members the caller may see. */
export function GET(req: Request) {
	return forwardToGauzy(req, '/timesheet/time-log/history');
}
