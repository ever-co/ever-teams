import { proxyInvoicePayOption } from '@/core/services/server/public-invoice-proxy';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twin of Gauzy's `GET /public/invoice-payments/invoice/:id/:token`: whether the invoice can be paid online.
export async function GET(_req: Request, { params }: INextParams) {
	const { id, token } = await params;
	return proxyInvoicePayOption(id ?? '', token ?? '');
}
