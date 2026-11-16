import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
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
 * what creating an invoice asks. It acts with the session's cookies, which another site's request also carries, so it
 * must come from this app's own pages.
 */
export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, '/invoice-schedules');
}
