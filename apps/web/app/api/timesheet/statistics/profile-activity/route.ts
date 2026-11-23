import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `/timesheet/statistics/profile-activity` (GET): the figures of a profile's month
 * summary. Without it the read answered 404 and the summary stayed empty in proxy mode (#5612).
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/timesheet/statistics/profile-activity');
}
