import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canCreateInvoices } from '@/core/lib/utils/invoice-access';

/**
 * Proxy mode twin of Gauzy's `PUT` and `DELETE /invoice-schedules/:id`: change, pause, resume or delete a schedule
 * (the invoices it made stay). Whoever saves it becomes the person its invoices are made as, so both ask what creating
 * an invoice asks.
 */
async function forwardScheduleChange(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	return forwardToGauzy(req, `/invoice-schedules/${encodeURIComponent(id)}`);
}

export const PUT = forwardScheduleChange;
export const DELETE = forwardScheduleChange;
