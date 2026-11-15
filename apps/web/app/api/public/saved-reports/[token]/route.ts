import { proxyReadSharedReport } from '@/core/services/server/saved-report-proxy';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twin of Gauzy's `GET /public/saved-reports/:token`: a shared report, read without a session.
export async function GET(_req: Request, { params }: INextParams) {
	const { token } = await params;
	return proxyReadSharedReport(token ?? '');
}
