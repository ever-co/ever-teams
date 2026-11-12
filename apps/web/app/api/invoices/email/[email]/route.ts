import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canEditInvoices } from '@/core/lib/utils/invoice-access';

/** Proxy mode twin of Gauzy's `PUT /invoices/email/:email`, which e-mails an invoice to that address as a PDF. */
export async function PUT(req: Request, { params }: { params: Promise<{ email: string }> }) {
	const { email } = await params;
	const refusal = await refuseUnlessPermitted(req, canEditInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an address such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedEmail = encodeURIComponent(email);
	return forwardToGauzy(req, `/invoices/email/${encodedEmail}`);
}
