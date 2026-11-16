import { proxyMergeEmployeePlaceholder } from '@/core/services/server/employee-placeholder-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

// Proxy mode twin of Gauzy's `POST /employee-placeholder/:id/merge`: a member without an account merged into a member.
// The merge moves time with the session's cookies, so it must come from this app's own pages.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;
	return proxyMergeEmployeePlaceholder(req, id);
}
