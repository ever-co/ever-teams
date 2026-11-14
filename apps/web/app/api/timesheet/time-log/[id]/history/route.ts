import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** The history of one time entry; Gauzy answers it only to people who may see that member's time. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// Encoded, so an id such as `../status` stays one path segment instead of reaching another endpoint
	return forwardToGauzy(req, `/timesheet/time-log/${encodeURIComponent(id)}/history`);
}
