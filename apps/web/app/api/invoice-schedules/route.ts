import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canCreateInvoices, canViewInvoices } from '@/core/lib/utils/invoice-access';

/** Proxy mode twin of Gauzy's `GET /invoice-schedules`: the workspace's billing schedules, or one client's. */
export async function GET(req: Request) {
	const refusal = await refuseUnlessPermitted(req, canViewInvoices);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, '/invoice-schedules');
}

/**
 * Proxy mode twin of Gauzy's `POST /invoice-schedules`. A schedule makes invoices from everyone's time, so it asks
 * what creating an invoice asks.
 */
export async function POST(req: Request) {
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, '/invoice-schedules');
}
