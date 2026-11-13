import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canCreateInvoices } from '@/core/lib/utils/invoice-access';

/** Proxy mode twin of Gauzy's `POST /invoices`, which creates an invoice and its lines. */
export async function POST(req: Request) {
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, '/invoices');
}
