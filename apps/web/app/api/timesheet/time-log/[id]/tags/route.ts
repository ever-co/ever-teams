import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

/** Files an entry under labels (Gauzy #12029); Gauzy refuses a caller who may not write that member's time. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;

	// Encoded, so an id such as `../status` stays one path segment instead of reaching another endpoint
	return forwardToGauzy(req, `/timesheet/time-log/${encodeURIComponent(id)}/tags`);
}
