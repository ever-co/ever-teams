import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canViewInvoices } from '@/core/lib/utils/invoice-access';

/** Proxy mode twin of Gauzy's `GET /invoices/download/:id`, which answers the invoice as a PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canViewInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/invoices/download/${encodedId}`);
}
