import { proxySavedReportWrite } from '@/core/services/server/saved-report-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twins of Gauzy's `PUT /saved-reports/:id` and `DELETE /saved-reports/:id` (the caller's own report). Both
// act with the session's cookies, so they must come from this app's own pages.
export async function PUT(req: Request, { params }: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;
	return proxySavedReportWrite(req, 'update', id ?? '');
}

export async function DELETE(req: Request, { params }: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id } = await params;
	return proxySavedReportWrite(req, 'delete', id ?? '');
}
