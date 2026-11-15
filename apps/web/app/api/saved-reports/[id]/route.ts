import { proxySavedReportWrite } from '@/core/services/server/saved-report-proxy';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twins of Gauzy's `PUT /saved-reports/:id` and `DELETE /saved-reports/:id` (the caller's own report).
export async function PUT(req: Request, { params }: INextParams) {
	const { id } = await params;
	return proxySavedReportWrite(req, 'update', id ?? '');
}

export async function DELETE(req: Request, { params }: INextParams) {
	const { id } = await params;
	return proxySavedReportWrite(req, 'delete', id ?? '');
}
