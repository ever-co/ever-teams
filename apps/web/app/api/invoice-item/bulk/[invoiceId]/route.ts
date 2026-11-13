import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canCreateInvoices } from '@/core/lib/utils/invoice-access';

/**
 * Proxy mode twin of Gauzy's `POST /invoice-item/bulk/:invoiceId`, which replaces every line of an invoice. Without
 * `CHANGE_SELECTED_EMPLOYEE` Gauzy deletes only the caller's own lines before saving the new ones, which doubles the
 * others: it asks what creating an invoice asks.
 */
export async function POST(req: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
	const { invoiceId } = await params;
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(invoiceId);
	return forwardToGauzy(req, `/invoice-item/bulk/${encodedId}`);
}
