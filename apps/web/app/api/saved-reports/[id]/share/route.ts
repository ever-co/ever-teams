import { proxySavedReportWrite } from '@/core/services/server/saved-report-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twins of Gauzy's `POST /saved-reports/:id/share` (turn a link on, or replace it) and
// `DELETE /saved-reports/:id/share` (turn it off). A share needs no body, so another site could post one with the
// session's cookies and no CORS preflight: both must come from this app's own pages.
export async function POST(req: Request, { params }: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;
	return proxySavedReportWrite(req, 'share', id ?? '');
}

export async function DELETE(req: Request, { params }: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;
	return proxySavedReportWrite(req, 'unshare', id ?? '');
}
