import { holdsRateAdminPermission } from '@/core/lib/utils/rates';

const INVOICES_VIEW_PERMISSION = 'INVOICES_VIEW';

const INVOICES_EDIT_PERMISSION = 'INVOICES_EDIT';

/** Without it the API answers a time read with the caller's own time only, and an invoice would miss the rest. */
const EVERYONE_TIME_PERMISSION = 'CHANGE_SELECTED_EMPLOYEE';

export interface InvoiceAccess {
	canView: boolean;
	canCreate: boolean;
}

/**
 * Invoices state what a client is billed per hour, so they open only for a role that reads invoices and client
 * rates. The API's default member role reads invoices too: the pages and the proxy routes ask for both.
 */
export function invoiceAccessOf(permissions: ReadonlyArray<string>): InvoiceAccess {
	const readsInvoices = permissions.includes(INVOICES_VIEW_PERMISSION);
	const readsClientRates = holdsRateAdminPermission(permissions);
	const canView = readsInvoices && readsClientRates;
	const writesInvoices = permissions.includes(INVOICES_EDIT_PERMISSION);
	const readsEveryoneTime = permissions.includes(EVERYONE_TIME_PERMISSION);
	const canWrite = writesInvoices && readsEveryoneTime;
	return { canView, canCreate: canView && canWrite };
}

export function canViewInvoices(permissions: ReadonlyArray<string>) {
	return invoiceAccessOf(permissions).canView;
}

export function canCreateInvoices(permissions: ReadonlyArray<string>) {
	return invoiceAccessOf(permissions).canCreate;
}
