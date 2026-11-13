import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseUnlessPermitted } from '@/core/services/server/refuse-without-permission';
import { canCreateInvoices, canEditInvoices, canViewInvoices } from '@/core/lib/utils/invoice-access';

/** Proxy mode twin of Gauzy's `GET /invoices/:id`: one invoice, with the relations its query names. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canViewInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/invoices/${encodedId}`);
}

/**
 * Proxy mode twin of Gauzy's `PUT /invoices/:id`, the first write of an edit. The edit then replaces the invoice's
 * lines from everyone's time, so it asks what creating an invoice asks.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canCreateInvoices);
	if (refusal) {
		return refusal;
	}
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/invoices/${encodedId}`);
}

/** Proxy mode twin of Gauzy's `DELETE /invoices/:id`. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const refusal = await refuseUnlessPermitted(req, canEditInvoices);
	if (refusal) {
		return refusal;
	}
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);
	return forwardToGauzy(req, `/invoices/${encodedId}`);
}
