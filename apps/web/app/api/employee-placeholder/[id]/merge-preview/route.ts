import { proxyPreviewEmployeePlaceholderMerge } from '@/core/services/server/employee-placeholder-proxy';

// Proxy mode twin of Gauzy's `GET /employee-placeholder/:id/merge-preview`: what a merge would move.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return proxyPreviewEmployeePlaceholderMerge(req, id);
}
