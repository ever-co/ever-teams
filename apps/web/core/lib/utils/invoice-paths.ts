const INVOICES_ROOT = '/invoices';

export function invoicePagePathOf(invoiceId: string) {
	return `${INVOICES_ROOT}/${encodeURIComponent(invoiceId)}`;
}
