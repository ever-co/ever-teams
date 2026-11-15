import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canViewInvoices } from '@/core/lib/utils/invoice-access';

/** Proxy mode twin of Gauzy's `GET /invoice-schedules/:id/runs`: a schedule's latest runs and their invoices. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canViewInvoices);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, `/invoice-schedules/${encodeURIComponent(id)}/runs`);
}
