import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canCreateInvoices } from '@/core/lib/utils/invoice-access';

/**
 * Proxy mode twin of Gauzy's `PUT /invoice-schedules/:id`: change, pause or resume a schedule. Whoever saves it becomes
 * the person its invoices are made as, so it asks what creating an invoice asks.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	return forwardToGauzy(req, `/invoice-schedules/${encodeURIComponent(id)}`);
}

/** Proxy mode twin of Gauzy's `DELETE /invoice-schedules/:id`; the invoices the schedule made stay. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, `/invoice-schedules/${encodeURIComponent(id)}`);
}
