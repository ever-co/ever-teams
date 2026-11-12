import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canEditInvoices } from '@/core/lib/utils/invoice-access';

/** Proxy mode twin of Gauzy's `PUT /invoices/:id/action`, which changes an invoice's status and payment fields. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canEditInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/invoices/${encodedId}/action`);
}
