import { proxyMergeEmployeePlaceholder } from '@/core/services/server/employee-placeholder-proxy';

// Proxy mode twin of Gauzy's `POST /employee-placeholder/:id/merge`: a member without an account merged into a member.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return proxyMergeEmployeePlaceholder(req, id);
}
