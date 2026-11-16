import { proxySavedReportWrite } from '@/core/services/server/saved-report-proxy';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twins of Gauzy's `POST /saved-reports/:id/share` (turn a link on, or replace it) and
// `DELETE /saved-reports/:id/share` (turn it off).
export async function POST(req: Request, { params }: INextParams) {
	const { id } = await params;
	return proxySavedReportWrite(req, 'share', id ?? '');
}

export async function DELETE(req: Request, { params }: INextParams) {
	const { id } = await params;
	return proxySavedReportWrite(req, 'unshare', id ?? '');
}
