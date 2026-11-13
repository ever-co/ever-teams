import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canViewInvoices } from '@/core/lib/utils/invoice-access';

/**
 * Proxy mode twin of Gauzy's `GET /invoices/pagination`. An invoice states what a client is billed per hour, and
 * Gauzy's default member role may read invoices: the route answers only a role that also reads client rates.
 */
export async function GET(req: Request) {
	const refusal = await refuseUnlessPermitted(req, canViewInvoices);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, '/invoices/pagination');
}
