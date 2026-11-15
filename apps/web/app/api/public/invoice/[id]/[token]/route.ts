import { proxyReadSharedInvoice } from '@/core/services/server/public-invoice-proxy';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twin of Gauzy's `GET /public/invoice/:id/:token`: an invoice read through its share link, without a session.
export async function GET(_req: Request, { params }: INextParams) {
	const { id, token } = await params;
	return proxyReadSharedInvoice(id ?? '', token ?? '');
}
