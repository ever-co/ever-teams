import { newInvoicePathOf } from '@/core/components/pages/invoices/invoice-access-guard';
import { isArchivedClient } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

/** Where a new invoice of the client starts; null where none is offered (an archived client, a role that may not). */
export function newInvoiceHrefOf(client: TClient, canCreateInvoice: boolean) {
	if (!canCreateInvoice) {
		return null;
	}
	if (isArchivedClient(client)) {
		return null;
	}
	return newInvoicePathOf(client.id);
}

/** The client whose invoices are read; none for a role that may not see invoices. */
export function invoicesReadOf(clientId: string, canViewInvoices: boolean) {
	if (!canViewInvoices) {
		return null;
	}
	return clientId;
}
