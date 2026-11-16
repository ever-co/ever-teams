import { proxyInvoiceCheckout } from '@/core/services/server/public-invoice-proxy';
import type { INextParams } from '@/core/types/interfaces/common/data-response';

// Proxy mode twin of Gauzy's `POST /public/invoice-payments/invoice/:id/:token/checkout`: opens the invoice's checkout.
export async function POST(req: Request, { params }: INextParams) {
	const { id, token } = await params;
	return proxyInvoiceCheckout(req, id ?? '', token ?? '');
}
