import { canCreateInvoices, canViewInvoices, invoiceAccessOf } from './invoice-access';

const ADMIN_PERMISSIONS = ['INVOICES_VIEW', 'INVOICES_EDIT', 'ORG_EMPLOYEES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

describe('invoiceAccessOf', () => {
	it('lets an administrator read invoices and create them', () => {
		expect(invoiceAccessOf(ADMIN_PERMISSIONS)).toEqual({ canView: true, canCreate: true });
		expect(canViewInvoices(ADMIN_PERMISSIONS)).toBe(true);
		expect(canCreateInvoices(ADMIN_PERMISSIONS)).toBe(true);
	});

	it('keeps out a member, who reads invoices by default but no client rate', () => {
		const memberPermissions = ['INVOICES_VIEW', 'INVOICES_EDIT', 'TIME_TRACKER', 'ORG_CONTACT_VIEW'];

		expect(invoiceAccessOf(memberPermissions)).toEqual({ canView: false, canCreate: false });
	});

	it('keeps out a role that reads client rates but no invoice', () => {
		expect(canViewInvoices(['CHANGE_SELECTED_EMPLOYEE', 'ORG_EMPLOYEES_EDIT'])).toBe(false);
	});

	it('shows the invoices without creating them to a role that cannot read everyone’s time', () => {
		const permissions = ['INVOICES_VIEW', 'INVOICES_EDIT', 'ORG_EMPLOYEES_EDIT'];

		expect(invoiceAccessOf(permissions)).toEqual({ canView: true, canCreate: false });
	});

	it('shows the invoices without creating them to a role that may not edit invoices', () => {
		const permissions = ['INVOICES_VIEW', 'CHANGE_SELECTED_EMPLOYEE'];

		expect(invoiceAccessOf(permissions)).toEqual({ canView: true, canCreate: false });
	});
});
