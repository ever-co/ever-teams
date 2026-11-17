import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

/**
 * Proxy mode twin of Gauzy's split of one entry (ever-co/ever-gauzy#12030): Gauzy checks the right to change the entry
 * (its permission, the organization's policy, the member) and answers its refusals with their status and code. An API
 * without the route answers 404, which the Calendar reads as "not offered".
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;

	// Encoded, so an id such as `../status` stays one path segment instead of reaching another endpoint
	return forwardToGauzy(req, `/timesheet/time-log/${encodeURIComponent(id)}/split`);
}
