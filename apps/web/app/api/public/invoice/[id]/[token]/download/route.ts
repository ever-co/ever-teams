import { proxyDownloadSharedInvoice } from '@/core/services/server/public-invoice-proxy';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twin of Gauzy's `GET /public/invoice/:id/:token/download`: the invoice's PDF, through its share link.
export async function GET(req: Request, { params }: INextParams) {
	const { id, token } = await params;
	return proxyDownloadSharedInvoice(req, id ?? '', token ?? '');
}
