import { proxyClaimEmployeePlaceholder } from '@/core/services/server/employee-placeholder-proxy';

// Proxy mode twin of Gauzy's `POST /employee-placeholder/:id/claim`: the invitation to claim a member's time.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return proxyClaimEmployeePlaceholder(req, id);
}
