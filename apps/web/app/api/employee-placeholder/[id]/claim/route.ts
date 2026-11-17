import { proxyClaimEmployeePlaceholder } from '@/core/services/server/employee-placeholder-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

// Proxy mode twin of Gauzy's `POST /employee-placeholder/:id/claim`: the invitation to claim a member's time. It sends
// an email with the session's cookies, so it must come from this app's own pages.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;
	return proxyClaimEmployeePlaceholder(req, id);
}
