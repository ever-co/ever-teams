import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canViewInvoices } from '@/core/lib/utils/invoice-access';

/** Proxy mode twin of Gauzy's `GET /invoices/highest`: the highest invoice number the workspace holds. */
export async function GET(req: Request) {
	const refusal = await refuseUnlessPermitted(req, canViewInvoices);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, '/invoices/highest');
}
