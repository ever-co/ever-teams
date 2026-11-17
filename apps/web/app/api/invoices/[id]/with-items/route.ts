import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canCreateInvoices } from '@/core/lib/utils/invoice-access';

/**
 * Proxy mode twin of Gauzy's `PUT /invoices/:id/with-items`, which saves an invoice's fields and replaces its lines in
 * one transaction, only while the invoice holds the `updatedAt` the edit read (409 otherwise). An edit replaces the
 * lines from everyone's time, so it asks what creating an invoice asks, as `PUT /api/invoices/[id]` does. Gauzy's own
 * answer is handed back, a 404 from a Gauzy without the route included: the edit then saves in two writes.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/invoices/${encodedId}/with-items`);
}
